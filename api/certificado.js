// Serverless function (Vercel, Node runtime): busca el certificado de participación
// de un asistente por sede y nombre, y devuelve SOLO su enlace de descarga.
//
// La lista de asistentes NO está en el repositorio (es público): se lee de la
// variable de entorno CERTIFICADOS_JSON, con este formato:
//   {"concepcion":[["Nombre Apellido","https://mega.nz/file/..."], ["Otra Persona", null], ...]}
// Un enlace null significa "certificado aún no disponible".

const ALLOWED_ORIGINS = new Set([
  "https://harmonyontour.sanamaro.cl",
  "https://harmony-on-tour-chile-2026.vercel.app",
  "https://harmony-on-tour-chile-2026-grupo-san-amaro.vercel.app",
]);

// Límite por IP (por instancia): evita que alguien recorra la lista probando nombres.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 15;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_MAX;
}

function clientIp(req) {
  return String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
}

// Minúsculas, sin tildes ni signos, espacios simples: "Martínez  Albistur" → "martinez albistur".
function normalize(value) {
  return String(value == null ? "" : value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-zñ0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let cache = null;
function loadList() {
  if (cache) return cache;
  try {
    cache = JSON.parse(process.env.CERTIFICADOS_JSON || "{}");
  } catch (err) {
    console.error("CERTIFICADOS_JSON inválido:", err.message);
    cache = {};
  }
  return cache;
}

// Coincidencia exacta del nombre completo o, si no, todas las palabras escritas
// (mínimo nombre + apellido) presentes en un único asistente.
function findPerson(list, query) {
  const q = normalize(query);
  const words = q.split(" ").filter(Boolean);
  if (words.length < 2) return { status: "need_full_name" };

  const exact = list.filter(([name]) => normalize(name) === q);
  const candidates = exact.length
    ? exact
    : list.filter(([name]) => {
        const nameWords = normalize(name).split(" ");
        return words.every((w) => nameWords.includes(w));
      });

  if (candidates.length === 1) return { status: "found", person: candidates[0] };
  if (candidates.length > 1) return { status: "ambiguous" };
  return { status: "not_found" };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método no permitido." });
    return;
  }
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    res.status(403).json({ ok: false, error: "Origen no permitido." });
    return;
  }
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    res.status(415).json({ ok: false, error: "Formato no soportado." });
    return;
  }
  if (rateLimited(clientIp(req))) {
    res.status(429).json({ ok: false, error: "Demasiadas búsquedas. Espera unos minutos e inténtalo de nuevo." });
    return;
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const sede = normalize(body.sede).replace(/\s+/g, "");
  const nombre = String(body.nombre || "").slice(0, 120);

  const lists = loadList();
  const list = Array.isArray(lists[sede]) ? lists[sede] : null;
  if (!list) {
    res.status(200).json({ ok: true, status: "sede_unavailable" });
    return;
  }

  const result = findPerson(list, nombre);
  if (result.status !== "found") {
    res.status(200).json({ ok: true, status: result.status });
    return;
  }

  const [fullName, link] = result.person;
  if (!link) {
    res.status(200).json({ ok: true, status: "pending", nombre: fullName });
    return;
  }
  res.status(200).json({ ok: true, status: "found", nombre: fullName, link });
};
