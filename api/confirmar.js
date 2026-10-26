// Serverless function (Vercel, Node runtime): "Confirmo mi asistencia" (postulación Guayaquil).
//
//   GET  /api/confirmar?id=<submission>&t=<firma>  → página con el botón de confirmar
//   POST /api/confirmar  (id, t)                   → marca "Confirmado" en Jotform
//
// La confirmación se hace con POST (botón) para que los escáneres de enlaces de los
// correos, que abren los links automáticamente, no confirmen por la persona.

const { ESTADOS, confirmTokenOk, getPostulacion, jotformUpdate, originOk, stamp } = require("./_lib/panel");

const SITE = "https://harmonyontour.sanamaro.cl";

function esc(str) {
  return String(str).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );
}

function page(res, status, { titulo, texto, form = "" }) {
  res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(titulo)} — Harmony On Tour Guayaquil</title>
<link rel="icon" href="/favicon.ico" sizes="any">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
  body{ margin:0; min-height:100vh; display:grid; place-items:center; padding:24px 16px; background:#0a0908; color:#f7f4f1; font-family:Inter,Arial,sans-serif; }
  .card{ width:100%; max-width:460px; background:#171412; border:1px solid #6b5a12; border-radius:18px; overflow:hidden; }
  .top{ padding:24px 26px; background:linear-gradient(135deg,#7a0707 0%,#3a0806 60%,#1c0a09 100%); }
  .brand{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#e8dcd8; }
  .city{ font-family:Oswald,Arial,sans-serif; font-size:44px; font-weight:700; text-transform:uppercase; line-height:1; margin-top:14px; }
  .body{ padding:24px 26px 28px; }
  h1{ font-family:Oswald,Arial,sans-serif; font-size:26px; text-transform:uppercase; margin:0 0 10px; line-height:1.15; }
  p{ color:#ada39a; line-height:1.6; margin:0 0 14px; }
  p b{ color:#f7f4f1; }
  .code{ font-family:'JetBrains Mono',monospace; font-size:30px; font-weight:700; letter-spacing:3px; color:#ffd84d; margin:6px 0 16px; }
  button{ width:100%; padding:16px; border:0; border-radius:10px; font:700 16px Inter,Arial,sans-serif; color:#fff; background:linear-gradient(135deg,#d21a1a,#5e0000); cursor:pointer; }
  a{ color:#ffd84d; }
</style>
</head>
<body>
  <main class="card">
    <div class="top"><div class="brand">Harmony On Tour · LATAM 2026</div><div class="city">Guayaquil</div></div>
    <div class="body">
      <h1>${esc(titulo)}</h1>
      ${texto}
      ${form}
      <p style="margin-top:18px;font-size:13px;">¿Dudas? Escríbenos a <a href="mailto:info@sanamaro.cl">info@sanamaro.cl</a> · <a href="${SITE}">harmonyontour.sanamaro.cl</a></p>
    </div>
  </main>
</body>
</html>`);
}

function invalid(res) {
  page(res, 400, {
    titulo: "Enlace no válido",
    texto: "<p>Este enlace de confirmación no es válido. Usa el botón del correo de aprobación o escríbenos para ayudarte.</p>",
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).end();
    return;
  }
  if (req.method === "POST" && !originOk(req)) {
    res.status(403).end();
    return;
  }

  const src = req.method === "POST" ? (req.body && typeof req.body === "object" ? req.body : {}) : req.query || {};
  const id = String(src.id || "");
  const t = String(src.t || "");
  if (!confirmTokenOk(id, t)) {
    invalid(res);
    return;
  }

  const apiKey = process.env.JOTFORM_API_KEY;
  try {
    const { ids, item } = await getPostulacion(id, apiKey);
    if (!item) {
      invalid(res);
      return;
    }
    const nombre = esc(item.nombre.split(/\s+/)[0] || "");

    if (item.estado === ESTADOS.confirmado) {
      page(res, 200, {
        titulo: "Asistencia confirmada",
        texto: `<p>¡Gracias${nombre ? ", " + nombre : ""}! Tu asistencia ya estaba confirmada. Te esperamos el <b>sábado 28 de noviembre</b>, de 10:00 a 14:00 hrs, en el <b>Hotel Wyndham Guayaquil Puerto Santa Ana</b>.</p><div class="code">${esc(item.codigo)}</div>`,
      });
      return;
    }
    if (item.estado !== ESTADOS.aprobado) {
      page(res, 409, {
        titulo: "Cupo no disponible",
        texto: "<p>Este cupo ya no está activo. Si crees que es un error, escríbenos y lo revisamos.</p>",
      });
      return;
    }

    if (req.method === "GET") {
      page(res, 200, {
        titulo: "Confirma tu asistencia",
        texto: `<p>Hola${nombre ? ", " + nombre : ""}. Tu cupo para el <b>sábado 28 de noviembre</b> (10:00 a 14:00 hrs, Hotel Wyndham Guayaquil Puerto Santa Ana) está aprobado. Confírmalo para mantenerlo.</p><div class="code">${esc(item.codigo)}</div>`,
        form: `<form method="post" action="/api/confirmar"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="t" value="${esc(t)}"><button type="submit">Confirmo mi asistencia</button></form>`,
      });
      return;
    }

    await jotformUpdate(item.id, {
      [ids.estado]: ESTADOS.confirmado,
      [ids.revisado]: `${item.revisado} · Confirmó asistencia ${stamp()}`.replace(/^ · /, ""),
    }, apiKey);
    page(res, 200, {
      titulo: "¡Asistencia confirmada!",
      texto: `<p>¡Gracias${nombre ? ", " + nombre : ""}! Te esperamos el <b>sábado 28 de noviembre</b>, de 10:00 a 14:00 hrs, en el <b>Hotel Wyndham Guayaquil Puerto Santa Ana</b>. Presenta este código en el ingreso:</p><div class="code">${esc(item.codigo)}</div>`,
    });
  } catch (err) {
    console.error("confirmar error:", err);
    page(res, 502, {
      titulo: "Inténtalo de nuevo",
      texto: "<p>No pudimos registrar tu confirmación en este momento. Vuelve a intentarlo en unos minutos.</p>",
    });
  }
};
