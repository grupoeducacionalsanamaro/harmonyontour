// Serverless function (Vercel, Node runtime): recibe la inscripción del formulario
// nativo de la landing y la crea como submission real en el formulario de Jotform
// "Harmony On Tour LATAM 2026 — Inscripción" (id 262586485506064), vía la API
// pública de Jotform. Requiere la variable de entorno JOTFORM_API_KEY.

const { FORM_ID, getQuestions, findQid } = require("./_lib/jotform");
const { sendConfirmationEmail } = require("./_lib/email");

// Mismo link y parámetros que arma la landing (js/app.js > buildPayUrl).
// Ofertas (lotes) de Hotmart por tipo de entrada.
const PAY_OFFERS = {
  // Antofagasta "últimas entradas" $29.990 (antes off=azs6ubw5 a $47.000).
  "Individual": "https://pay.hotmart.com/L107640931E?off=yfkc12se",
  "Promoción 2x1": "https://pay.hotmart.com/L107640931E?off=vt8lmjbk",
};
const SCK_BY_SEDE = {
  "Concepción — 17 de octubre": "HOT_CONCEPCION",
  "Antofagasta — 24 de octubre": "HOT_ANTOFAGASTA",
  "Guayaquil — Ecuador": "HOT_GUAYAQUIL",
};

// Sedes gratuitas con postulación (sin pago): el equipo aprueba los cupos.
// Guayaquil: postulaciones hasta el 19 nov 2026 (cierre 20 nov 00:00 hora de Ecuador).
const SEDES_POSTULACION = {
  "Guayaquil — Ecuador": { cierre: Date.parse("2026-11-20T00:00:00-05:00") },
};

function buildPayUrl({ sede, submissionId, email, nombre, tipoEntrada }) {
  const url = new URL(PAY_OFFERS[tipoEntrada] || PAY_OFFERS.Individual);
  url.searchParams.set("sck", SCK_BY_SEDE[sede]);
  if (submissionId) url.searchParams.set("src", "JF" + submissionId);
  url.searchParams.set("email", email);
  url.searchParams.set("name", nombre);
  return url.toString();
}

// Orígenes desde los que se aceptan inscripciones (bloquea envíos desde otros sitios).
const ALLOWED_ORIGINS = new Set([
  "https://harmonyontour.sanamaro.cl",
  "https://harmony-on-tour-chile-2026.vercel.app",
  "https://harmony-on-tour-chile-2026-grupo-san-amaro.vercel.app",
]);

// Valores permitidos: deben coincidir con las opciones del formulario de la landing.
const SEDES = new Set(["Concepción — 17 de octubre", "Antofagasta — 24 de octubre", "Guayaquil — Ecuador"]);
// Sedes ya realizadas / agotadas: no aceptan nuevas inscripciones.
const SEDES_CERRADAS = new Set(["Concepción — 17 de octubre", "Antofagasta — 24 de octubre"]);
// Sedes con promoción 2x1 (2 entradas por $47.000; individual $29.990): permiten registrar acompañante.
const SEDES_2X1 = new Set(["Concepción — 17 de octubre", "Antofagasta — 24 de octubre"]);
const PROFESIONES = new Set([
  "Médico(a) cirujano(a)",
  "Cirujano(a)-dentista",
  "Estudiante de Medicina",
  "Estudiante de Odontología",
  "Otro profesional de la salud",
]);
const NIVELES = new Set([
  "Sin experiencia",
  "Cursos iniciales",
  "Formación intermedia (Diplomado)",
  "Formación avanzada (Postgrado / Especialista)",
]);

// Límite simple por IP (por instancia de la función): 5 inscripciones cada 10 minutos.
// Complementa la regla de rate limit del firewall de Vercel.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
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

// Normaliza texto: quita caracteres de control, colapsa espacios y recorta al máximo.
function clean(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Evita inyección de fórmulas si las inscripciones se exportan a Excel/CSV.
function noFormula(value) {
  return value.replace(/^[=+\-@]+/, "").trim();
}

function isValidEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function fail(res, status, error) {
  res.status(status).json({ success: false, error });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    fail(res, 405, "Método no permitido.");
    return;
  }

  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    fail(res, 403, "Origen no permitido.");
    return;
  }

  // Exigir JSON evita que otros sitios envíen formularios "simples" sin preflight CORS.
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    fail(res, 415, "Formato no soportado.");
    return;
  }

  if (rateLimited(clientIp(req))) {
    fail(res, 429, "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
    return;
  }

  const apiKey = process.env.JOTFORM_API_KEY;
  if (!apiKey) {
    console.error("JOTFORM_API_KEY no está configurada.");
    fail(res, 500, "Configuración del servidor incompleta.");
    return;
  }

  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};

  // Anti-bots: campo trampa lleno o formulario enviado en menos de 2,5 s.
  // Se responde "éxito" sin registrar nada para no darle pistas al bot.
  const tiempo = Number(body.t);
  if (String(body.empresa || "").trim() !== "" || (Number.isFinite(tiempo) && tiempo > 0 && tiempo < 2500)) {
    console.warn("register: envío descartado por anti-bot", { ip: clientIp(req) });
    res.status(200).json({ success: true, submissionId: null });
    return;
  }

  const sede = clean(body.sede, 60);
  const nombre = noFormula(clean(body.nombre, 100));
  const email = clean(body.email, 254).toLowerCase();
  const whatsapp = clean(body.whatsapp, 25);
  const profesion = clean(body.profesion, 80);
  const nivel = clean(body.nivel, 80);
  // Tipo de entrada: el 2x1 solo existe en las sedes de Chile; el resto es "Individual".
  const tipoPedido = clean(body.tipo_entrada, 30);
  const tipoEntrada = SEDES_2X1.has(sede) && tipoPedido === "Promoción 2x1" ? "Promoción 2x1" : "Individual";
  // Acompañante: solo con la promoción 2x1 (opcional).
  const conAcompanante = tipoEntrada === "Promoción 2x1";
  const acompNombre = conAcompanante ? noFormula(clean(body.acompanante_nombre, 100)) : "";
  const acompEmail = conAcompanante ? clean(body.acompanante_email, 254).toLowerCase() : "";

  if (!sede || !nombre || !email || !whatsapp || !profesion || !nivel) {
    fail(res, 400, "Faltan campos obligatorios.");
    return;
  }
  if (SEDES_CERRADAS.has(sede)) {
    fail(res, 400, `Las inscripciones para ${sede.split(" — ")[0]} están cerradas: la jornada ya se realizó (sold out).`);
    return;
  }
  const postulacion = SEDES_POSTULACION[sede] || null;
  if (postulacion && Date.now() >= postulacion.cierre) {
    fail(res, 400, "Las postulaciones para Guayaquil cerraron el 19 de noviembre.");
    return;
  }
  if (!SEDES.has(sede) || !PROFESIONES.has(profesion) || !NIVELES.has(nivel)) {
    fail(res, 400, "Selecciona una opción válida en cada campo.");
    return;
  }
  if (nombre.length < 3 || !/[a-záéíóúñü]/i.test(nombre)) {
    fail(res, 400, "Ingresa tu nombre y apellido.");
    return;
  }
  if (!isValidEmail(email)) {
    fail(res, 400, "Ingresa un correo válido.");
    return;
  }
  if (!/^\+?[0-9\s()\-.]{8,25}$/.test(whatsapp) || whatsapp.replace(/[^0-9]/g, "").length < 8) {
    fail(res, 400, "Ingresa un número de WhatsApp válido.");
    return;
  }
  if (acompEmail && (!isValidEmail(acompEmail) || acompEmail === email)) {
    fail(res, 400, "Revisa el correo del acompañante.");
    return;
  }
  if (acompNombre && (acompNombre.length < 3 || !/[a-záéíóúñü]/i.test(acompNombre))) {
    fail(res, 400, "Ingresa el nombre y apellido del acompañante.");
    return;
  }

  try {
    const questions = await getQuestions(apiKey);

    const textFields = {
      "Sede": sede,
      "Nombre y Apellido": nombre,
      "Correo electrónico": email,
      "Profesión": profesion,
      "Nivel de formación en armonización orofacial": nivel,
    };

    const params = new URLSearchParams();
    let matched = 0;

    for (const [label, value] of Object.entries(textFields)) {
      const qid = findQid(questions, label);
      if (qid) {
        params.append(`submission[${qid}]`, value);
        matched++;
      }
    }

    const whatsappQid = findQid(questions, "WhatsApp");
    if (whatsappQid) {
      params.append(`submission[${whatsappQid}][full]`, whatsapp);
      matched++;
    }

    // Campos opcionales (tipo de entrada y acompañante): se envían solo si existen en el formulario.
    const acompFields = {
      "Tipo de entrada": tipoEntrada,
      "Nombre del acompañante": acompNombre,
      "Correo del acompañante": acompEmail,
      // Postulación: queda en revisión hasta que el equipo apruebe el cupo.
      "Estado de inscripción": postulacion ? "En revisión" : "",
    };
    for (const [label, value] of Object.entries(acompFields)) {
      const qid = value && findQid(questions, label);
      if (qid) params.append(`submission[${qid}]`, value);
    }

    if (matched < 6) {
      throw new Error(
        `No se pudieron mapear todos los campos del formulario (${matched}/6). Revisa que las preguntas de Jotform no hayan cambiado de texto.`
      );
    }

    const submitRes = await fetch(
      `https://api.jotform.com/form/${FORM_ID}/submissions?apiKey=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );

    const submitJson = await submitRes.json().catch(() => ({}));

    if (!submitRes.ok || (submitJson.responseCode && submitJson.responseCode >= 400)) {
      throw new Error(submitJson.message || "Jotform rechazó la inscripción.");
    }

    // El id de la submission se devuelve para enlazar el pago de Hotmart (parámetro src).
    const submissionId = (submitJson.content && submitJson.content.submissionID) || null;

    // Correo de confirmación: si falla, la inscripción igual queda registrada.
    const payUrl = postulacion ? "" : buildPayUrl({ sede, submissionId, email, nombre, tipoEntrada });
    const mail = await sendConfirmationEmail({ to: email, nombre, sede, payUrl, tipoEntrada, acompNombre, acompEmail });

    res.status(200).json({ success: true, submissionId, emailSent: mail.sent, postulacion: !!postulacion });
  } catch (err) {
    console.error("register error:", err);
    res.status(502).json({
      success: false,
      error: "No pudimos registrar tu inscripción en este momento.",
    });
  }
}
