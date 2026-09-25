// Serverless function (Vercel, Node runtime): recibe la inscripción del formulario
// nativo de la landing y la crea como submission real en el formulario de Jotform
// "Harmony On Tour Chile 2026 — Inscripción" (id 262586485506064), vía la API
// pública de Jotform. Requiere la variable de entorno JOTFORM_API_KEY.

const FORM_ID = "262586485506064";
const CACHE_TTL_MS = 10 * 60 * 1000;

let questionCache = null;
let questionCacheAt = 0;

async function getQuestions(apiKey) {
  const now = Date.now();
  if (questionCache && now - questionCacheAt < CACHE_TTL_MS) return questionCache;

  const res = await fetch(
    `https://api.jotform.com/form/${FORM_ID}/questions?apiKey=${encodeURIComponent(apiKey)}`
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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Método no permitido." });
    return;
  }

  const apiKey = process.env.JOTFORM_API_KEY;
  if (!apiKey) {
    console.error("JOTFORM_API_KEY no está configurada.");
    res.status(500).json({ success: false, error: "Configuración del servidor incompleta." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const sede = String(body.sede || "").trim();
  const nombre = String(body.nombre || "").trim();
  const email = String(body.email || "").trim();
  const whatsapp = String(body.whatsapp || "").trim();
  const profesion = String(body.profesion || "").trim();
  const nivel = String(body.nivel || "").trim();

  if (!sede || !nombre || !email || !whatsapp || !profesion || !nivel) {
    res.status(400).json({ success: false, error: "Faltan campos obligatorios." });
    return;
  }
  if (nombre.length < 3) {
    res.status(400).json({ success: false, error: "Ingresa tu nombre y apellido." });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ success: false, error: "Ingresa un correo válido." });
    return;
  }
  if (whatsapp.replace(/[^0-9]/g, "").length < 8) {
    res.status(400).json({ success: false, error: "Ingresa un número de WhatsApp válido." });
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

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("register error:", err);
    res.status(502).json({
      success: false,
      error: "No pudimos registrar tu inscripción en este momento.",
    });
  }
}
