// Utilidades compartidas para la API de Jotform (formulario de inscripción
// "Harmony On Tour Chile 2026 — Inscripción"). Las usan /api/register y
// /api/hotmart-webhook. Requiere la variable de entorno JOTFORM_API_KEY.

const FORM_ID = "262586485506064";
const API = "https://api.jotform.com";
const CACHE_TTL_MS = 10 * 60 * 1000;

let questionCache = null;
let questionCacheAt = 0;

async function getQuestions(apiKey) {
  const now = Date.now();
  if (questionCache && now - questionCacheAt < CACHE_TTL_MS) return questionCache;

  const res = await fetch(
    `${API}/form/${FORM_ID}/questions?apiKey=${encodeURIComponent(apiKey)}`
  );
  if (!res.ok) {
    throw new Error("No se pudo leer la estructura del formulario de Jotform.");
  }
  const json = await res.json();
  questionCache = json.content || {};
  questionCacheAt = now;
  return questionCache;
}

function findQid(questions, label) {
  for (const qid of Object.keys(questions)) {
    const q = questions[qid];
    if ((q.text || "").trim() === label) return qid;
  }
  return null;
}

module.exports = { FORM_ID, API, getQuestions, findQid };
