// Serverless function (Vercel, Node runtime): recibe el Webhook 2.0 de Hotmart
// y actualiza el estado de pago de la preinscripción en Jotform.
//
// Cómo encuentra la preinscripción:
//   1. purchase.origin.src = "JF<submissionId>" (lo agrega el botón de pago de la landing).
//   2. Si no viene src, busca la preinscripción más reciente con el correo del comprador.
//
// Escribe en dos campos del formulario de Jotform (se ubican por su texto):
//   "Estado de pago"   -> Pagado / Pendiente de pago / Reembolsado / ...
//   "Detalle de pago"  -> transacción, sede (sck), monto y fecha
//
// Variables de entorno: JOTFORM_API_KEY y HOTMART_HOTTOK (token de la cuenta de
// Hotmart, llega en el header X-HOTMART-HOTTOK de cada request).

const crypto = require("crypto");
const { FORM_ID, API, getQuestions, findQid } = require("../lib/jotform");

const STATUS_LABEL = "Estado de pago";
const DETAIL_LABEL = "Detalle de pago";
const EMAIL_LABEL = "Correo electrónico";

const EVENT_STATUS = {
  PURCHASE_APPROVED: "Pagado",
  PURCHASE_COMPLETE: "Pagado",
  PURCHASE_BILLET_PRINTED: "Pendiente de pago",
  PURCHASE_DELAYED: "Pendiente de pago",
  PURCHASE_PROTEST: "En disputa",
  PURCHASE_REFUNDED: "Reembolsado",
  PURCHASE_CHARGEBACK: "Contracargo",
  PURCHASE_CANCELED: "Cancelado",
  PURCHASE_EXPIRED: "Cancelado",
};

const SEDES = {
  HOT_CONCEPCION: "Concepción",
  HOT_ANTOFAGASTA: "Antofagasta",
};

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function formatDate(ms) {
  if (!ms) return "";
  return new Date(Number(ms)).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  });
}

async function jotformGet(path, apiKey) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${sep}apiKey=${encodeURIComponent(apiKey)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.responseCode && json.responseCode >= 400)) return null;
  return json.content;
}

function answerOf(submission, qid) {
  const a = submission && submission.answers && submission.answers[qid];
  return a && typeof a.answer === "string" ? a.answer.trim() : "";
}

async function findSubmission({ src, email }, questions, apiKey) {
  const match = /^JF(\d+)$/.exec(String(src || "").trim());
  if (match) {
    const sub = await jotformGet(`/submission/${match[1]}`, apiKey);
    if (sub && sub.form_id === FORM_ID && sub.status !== "DELETED") return { sub, via: "src" };
  }

  if (email) {
    const emailQid = findQid(questions, EMAIL_LABEL);
    const list = await jotformGet(
      `/form/${FORM_ID}/submissions?limit=1000&orderby=created_at`,
      apiKey
    );
    if (emailQid && Array.isArray(list)) {
      const wanted = email.trim().toLowerCase();
      const sub = list.find(
        (s) => s.status !== "DELETED" && answerOf(s, emailQid).toLowerCase() === wanted
      );
      if (sub) return { sub, via: "email" };
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método no permitido." });
    return;
  }

  const hottok = process.env.HOTMART_HOTTOK;
  const apiKey = process.env.JOTFORM_API_KEY;
  if (!hottok || !apiKey) {
    console.error("Faltan HOTMART_HOTTOK o JOTFORM_API_KEY.");
    res.status(503).json({ ok: false, error: "Configuración del servidor incompleta." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Webhook 2.0 envía el token en el header; el formato antiguo lo mandaba en el body.
  const receivedToken = req.headers["x-hotmart-hottok"] || body.hottok;
  if (!safeEqual(receivedToken, hottok)) {
    res.status(401).json({ ok: false, error: "Token inválido." });
    return;
  }

  const event = body.event;
  const data = body.data || {};
  const purchase = data.purchase || {};
  const origin = purchase.origin || data.origin || {};
  const buyer = data.buyer || {};
  const status = EVENT_STATUS[event];

  if (!status) {
    res.status(200).json({ ok: true, ignored: `Evento no manejado: ${event || "(vacío)"}` });
    return;
  }

  try {
    const questions = await getQuestions(apiKey);
    const statusQid = findQid(questions, STATUS_LABEL);
    const detailQid = findQid(questions, DETAIL_LABEL);
    if (!statusQid) {
      throw new Error(`El formulario de Jotform no tiene el campo "${STATUS_LABEL}".`);
    }

    const found = await findSubmission({ src: origin.src, email: buyer.email }, questions, apiKey);
    if (!found) {
      // 200 para que Hotmart no reintente eternamente (p. ej. el evento de prueba del panel).
      console.warn("hotmart-webhook: sin preinscripción", {
        event, transaction: purchase.transaction, src: origin.src, sck: origin.sck,
      });
      res.status(200).json({ ok: true, matched: false });
      return;
    }

    // No retroceder de "Pagado" a "Pendiente" si los eventos llegan desordenados.
    const current = answerOf(found.sub, statusQid);
    if (current === "Pagado" && status === "Pendiente de pago") {
      res.status(200).json({ ok: true, matched: true, skipped: "Ya estaba Pagado." });
      return;
    }

    const price = purchase.price || {};
    const detail = [
      purchase.transaction && `Transacción ${purchase.transaction}`,
      origin.sck && `Sede ${SEDES[origin.sck] || origin.sck}`,
      price.value != null &&
        `$${Number(price.value).toLocaleString("es-CL")} ${price.currency_value || ""}`.trim(),
      formatDate(purchase.approved_date || body.creation_date),
      found.via === "email" && "(vinculado por correo)",
    ].filter(Boolean).join(" · ");

    const params = new URLSearchParams();
    params.append(`submission[${statusQid}]`, status);
    if (detailQid) params.append(`submission[${detailQid}]`, detail);

    const upd = await fetch(
      `${API}/submission/${found.sub.id}?apiKey=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );
    const updJson = await upd.json().catch(() => ({}));
    if (!upd.ok || (updJson.responseCode && updJson.responseCode >= 400)) {
      throw new Error(updJson.message || "Jotform rechazó la actualización.");
    }

    res.status(200).json({ ok: true, matched: true, submissionId: found.sub.id, status });
  } catch (err) {
    // 500 para que Hotmart reintente más tarde.
    console.error("hotmart-webhook error:", err);
    res.status(500).json({ ok: false, error: "No se pudo actualizar la preinscripción." });
  }
};
