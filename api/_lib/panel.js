// Panel privado de postulaciones (Guayaquil): sesión, roles y acceso a Jotform.
//
// Acceso: contraseña compartida (variable de entorno PANEL_PASSWORD) + rol elegido al entrar.
// La sesión es una cookie HttpOnly firmada (HMAC) con una clave derivada de PANEL_PASSWORD:
// cambiar la contraseña cierra todas las sesiones abiertas.
//
// Enlaces "Confirmo mi asistencia" del correo de aprobación: firmados con una clave derivada
// de JOTFORM_API_KEY (no caducan al cambiar la contraseña del panel).

const crypto = require("crypto");
const { FORM_ID, API, getQuestions, findQid } = require("./jotform");

const ROLES = {
  rrpp: "Relaciones Públicas · Carla Fuenmayor",
  marketing: "Marketing · Elio Rincón",
  direccion: "Dirección · Alexis Gonzalez",
};

const SEDE = "Guayaquil — Ecuador";
const CUPO = 60;
const CODE_PREFIX = "GYE-";

const ESTADOS = {
  revision: "En revisión",
  aprobado: "Aprobado",
  confirmado: "Confirmado",
  espera: "Lista de espera",
  rechazado: "No aprobado",
};

const ALLOWED_ORIGINS = new Set([
  "https://harmonyontour.sanamaro.cl",
  "https://harmony-on-tour-chile-2026.vercel.app",
  "https://harmony-on-tour-chile-2026-grupo-san-amaro.vercel.app",
]);

const COOKIE = "hot_panel";
const SESSION_MS = 12 * 60 * 60 * 1000;

// ---------- Sesión ----------

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest();
}

function sessionKey() {
  const pass = process.env.PANEL_PASSWORD;
  return pass ? sha256("panel-session:" + pass) : null;
}

function sign(key, payload) {
  return crypto.createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function passwordOk(input) {
  const pass = process.env.PANEL_PASSWORD;
  if (!pass) return false;
  return crypto.timingSafeEqual(sha256(input), sha256(pass));
}

function createSession(role) {
  const payload = Buffer.from(JSON.stringify({ role, exp: Date.now() + SESSION_MS })).toString("base64url");
  return `${payload}.${sign(sessionKey(), payload)}`;
}

function readSession(req) {
  const key = sessionKey();
  if (!key) return null;
  const match = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.cookie || "");
  if (!match) return null;
  const [payload, sig] = match[1].split(".");
  if (!payload || !sig || !safeEqual(sig, sign(key, payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!ROLES[data.role] || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function sessionCookie(value, maxAgeSeconds) {
  return `${COOKIE}=${value}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

// Bloquea peticiones POST desde otros sitios (además de SameSite=Strict).
function originOk(req) {
  const origin = req.headers.origin;
  return !origin || ALLOWED_ORIGINS.has(origin);
}

// ---------- Enlaces de confirmación ----------

function confirmKey() {
  const k = process.env.JOTFORM_API_KEY;
  return k ? sha256("confirmar-asistencia:" + k) : null;
}

function confirmToken(submissionId) {
  return sign(confirmKey(), String(submissionId)).slice(0, 32);
}

function confirmTokenOk(submissionId, token) {
  if (!confirmKey() || !/^\d+$/.test(String(submissionId))) return false;
  return safeEqual(token || "", confirmToken(submissionId));
}

// ---------- Jotform ----------

async function jotformGet(path, apiKey) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${sep}apiKey=${encodeURIComponent(apiKey)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.responseCode && json.responseCode >= 400)) {
    throw new Error(json.message || `Jotform respondió ${res.status}`);
  }
  return json.content;
}

async function jotformUpdate(submissionId, fields, apiKey) {
  const params = new URLSearchParams();
  for (const [qid, value] of Object.entries(fields)) params.append(`submission[${qid}]`, value);
  const res = await fetch(`${API}/submission/${submissionId}?apiKey=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.responseCode && json.responseCode >= 400)) {
    throw new Error(json.message || "Jotform rechazó la actualización.");
  }
}

function answerOf(sub, qid) {
  const a = qid && sub.answers && sub.answers[qid];
  if (!a || a.answer == null) return "";
  if (typeof a.answer === "object") return String(a.answer.full || Object.values(a.answer).join(" ")).trim();
  return String(a.answer).trim();
}

async function fieldIds(apiKey) {
  const q = await getQuestions(apiKey);
  const ids = {
    sede: findQid(q, "Sede"),
    nombre: findQid(q, "Nombre y Apellido"),
    email: findQid(q, "Correo electrónico"),
    whatsapp: findQid(q, "WhatsApp"),
    profesion: findQid(q, "Profesión"),
    otra: findQid(q, "Otra profesión"),
    nivel: findQid(q, "Nivel de formación en armonización orofacial"),
    estado: findQid(q, "Estado de inscripción"),
    codigo: findQid(q, "Código de ticket"),
    revisado: findQid(q, "Revisado por"),
    pago: findQid(q, "Estado de pago"),
  };
  for (const key of ["sede", "nombre", "email", "estado", "codigo", "revisado"]) {
    if (!ids[key]) throw new Error(`Falta el campo de Jotform para "${key}".`);
  }
  return ids;
}

function toPostulacion(sub, ids) {
  const profesion = answerOf(sub, ids.profesion);
  return {
    id: String(sub.id),
    fecha: sub.created_at,
    nombre: answerOf(sub, ids.nombre),
    email: answerOf(sub, ids.email).toLowerCase(),
    whatsapp: answerOf(sub, ids.whatsapp),
    profesion,
    otraProfesion: answerOf(sub, ids.otra),
    nivel: answerOf(sub, ids.nivel),
    estudiante: /^estudiante/i.test(profesion),
    estado: answerOf(sub, ids.estado) || ESTADOS.revision,
    codigo: answerOf(sub, ids.codigo),
    revisado: answerOf(sub, ids.revisado),
    pago: answerOf(sub, ids.pago),
  };
}

async function listPostulaciones(apiKey) {
  const ids = await fieldIds(apiKey);
  const subs = await jotformGet(`/form/${FORM_ID}/submissions?limit=1000&orderby=created_at`, apiKey);
  const list = (Array.isArray(subs) ? subs : [])
    .filter((s) => s.status !== "DELETED" && answerOf(s, ids.sede) === SEDE)
    .map((s) => toPostulacion(s, ids))
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  return { ids, list };
}

async function getPostulacion(submissionId, apiKey) {
  const ids = await fieldIds(apiKey);
  const sub = await jotformGet(`/submission/${submissionId}`, apiKey);
  if (!sub || sub.form_id !== FORM_ID || sub.status === "DELETED" || answerOf(sub, ids.sede) !== SEDE) return { ids, item: null };
  return { ids, item: toPostulacion(sub, ids) };
}

function ocupaCupo(estado) {
  return estado === ESTADOS.aprobado || estado === ESTADOS.confirmado;
}

function nextCode(list) {
  const max = list.reduce((m, p) => {
    const n = parseInt(String(p.codigo).replace(CODE_PREFIX, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return CODE_PREFIX + String(max + 1).padStart(3, "0");
}

// Fecha y hora de Ecuador para el registro "Revisado por".
function stamp() {
  return new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil", dateStyle: "short", timeStyle: "short" });
}

module.exports = {
  ROLES, SEDE, CUPO, ESTADOS,
  passwordOk, createSession, readSession, sessionCookie, originOk, SESSION_MS,
  confirmToken, confirmTokenOk,
  jotformUpdate, listPostulaciones, getPostulacion, ocupaCupo, nextCode, stamp,
};
