// Correo de confirmación de preinscripción (Resend). Lo usa /api/register.
// Diseño tipo "ticket" alineado a la landing, con tablas e estilos inline para que
// se vea bien en Gmail, Outlook y Apple Mail.
//
// Variable de entorno: RESEND_API_KEY. Sin ella el envío se omite (la inscripción
// igual se registra).

const SITE = "https://harmonyontour.sanamaro.cl";
const FROM = "Harmony On Tour Chile <harmonyontour@send.sanamaro.cl>";
const REPLY_TO = "info@sanamaro.cl";
const BCC = "relacionespublicas@sanamaro.cl";

// Mismo corte que la landing (js/presale.js): 16 oct 2026 00:00 hora de Chile.
const PRESALE_END = Date.parse("2026-10-16T00:00:00-03:00");
const PRICE_PRESALE = "$19.990";
const PRICE_REGULAR = "$47.000";

const SEDES = {
  "Concepción — 17 de octubre": {
    ciudad: "Concepción",
    edicion: "01",
    fecha: "Sábado 17 de octubre de 2026",
    speakers: ["Dra. Javiera Vergara", "Dra. Pamela Flores", "Dra. Marjorie Gold"],
  },
  "Antofagasta — 24 de octubre": {
    ciudad: "Antofagasta",
    edicion: "02",
    fecha: "Sábado 24 de octubre de 2026",
    speakers: ["Dra. Loreto Campos", "Dr. Miguel Romero", "Dra. Marjorie Gold", "Dra. Sofía Montes"],
  },
};

function esc(str) {
  return String(str).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );
}

function firstName(nombre) {
  return String(nombre).trim().split(/\s+/)[0] || "";
}

function field(label, value) {
  return `
                  <td valign="top" style="padding:0 0 18px 0;">
                    <div style="font-family:'JetBrains Mono',Consolas,'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ada39a;">${label}</div>
                    <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#f7f4f1;line-height:1.4;padding-top:4px;">${value}</div>
                  </td>`;
}

function buildConfirmationEmail({ nombre, sede, payUrl, now = Date.now() }) {
  const info = SEDES[sede];
  if (!info) throw new Error(`Sede desconocida para el correo: ${sede}`);

  const presale = now < PRESALE_END;
  const price = presale ? PRICE_PRESALE : PRICE_REGULAR;
  const hola = firstName(nombre);
  const subject = `Tu preinscripción a Harmony On Tour ${info.ciudad} quedó registrada`;
  const preheader = `${info.fecha} · 10:00 a 14:00 hrs. Completa el pago para recibir tu ticket de acceso.`;

  const priceHtml = presale
    ? `${PRICE_PRESALE} CLP <span style="font-size:13px;font-weight:500;color:#ada39a;">· preventa hasta el 15 oct (luego <s>${PRICE_REGULAR}</s>)</span>`
    : `${PRICE_REGULAR} CLP`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  @media (max-width:620px){
    .container{width:100%!important;}
    .px{padding-left:22px!important;padding-right:22px!important;}
    .city{font-size:40px!important;}
    .col{display:block!important;width:100%!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#0a0908;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0a0908;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0908" style="background:#0a0908;">
  <tr>
    <td align="center" style="padding:28px 12px 40px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

        <!-- Marca -->
        <tr>
          <td class="px" style="padding:0 8px 22px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td valign="middle"><img src="${SITE}/img/email/harmony-logo.png" width="40" height="40" alt="Harmony" style="display:block;border:0;border-radius:50%;"></td>
              <td valign="middle" style="padding-left:12px;">
                <div style="font-family:Oswald,'Arial Narrow',Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:1px;color:#f7f4f1;line-height:1;">HARMONY</div>
                <div style="font-family:Inter,Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#ada39a;padding-top:3px;">INSTITUTO INTERNACIONAL</div>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td class="px" style="padding:0 8px 26px;">
            <div style="font-family:Oswald,'Arial Narrow',Arial,sans-serif;font-size:30px;font-weight:700;line-height:1.1;color:#f7f4f1;text-transform:uppercase;">¡Hola${hola ? ", " + esc(hola) : ""}! Tu preinscripción quedó registrada</div>
            <div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.65;color:#ada39a;padding-top:14px;">
              Gracias por inscribirte en <strong style="color:#f7f4f1;">Harmony On Tour Chile 2026</strong>. Estos son los datos de tu jornada.
            </div>
          </td>
        </tr>

        <!-- Ticket -->
        <tr>
          <td style="padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#171412" style="background:#171412;border:1px solid #3a3330;border-radius:18px;">
              <!-- Cabecera roja -->
              <tr>
                <td class="px" bgcolor="#5e0000" style="background:#5e0000;background-image:linear-gradient(135deg,#7a0707 0%,#3a0806 60%,#1c0a09 100%);border-radius:17px 17px 0 0;padding:26px 30px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:'JetBrains Mono',Consolas,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e8dcd8;">Harmony On Tour · Chile 2026</td>
                    <td align="right"><span style="display:inline-block;font-family:'JetBrains Mono',Consolas,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;background:#d21a1a;padding:4px 9px;border-radius:4px;">Preinscripción</span></td>
                  </tr></table>
                  <div class="city" style="font-family:Oswald,'Arial Narrow',Impact,Arial,sans-serif;font-size:50px;font-weight:700;line-height:1;color:#f7f4f1;text-transform:uppercase;padding-top:18px;">${esc(info.ciudad)}</div>
                  <div style="font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e8dcd8;padding-top:10px;">Edición ${info.edicion} · Presencial</div>
                </td>
              </tr>

              <!-- Campos -->
              <tr>
                <td class="px" style="padding:26px 30px 8px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>${field("Fecha", esc(info.fecha))}
                    </tr>
                    <tr>${field("Horario", "10:00 a 14:00 hrs")}
                    </tr>
                    <tr>${field("Speakers", info.speakers.map((n) => `<span style="white-space:nowrap;">${esc(n)}</span>`).join(" · "))}
                    </tr>
                    <tr>${field("Lugar", `${esc(info.ciudad)}, Chile<br><span style="font-size:13px;font-weight:500;color:#ada39a;">La dirección exacta te llegará junto con tu ticket de acceso.</span>`)}
                    </tr>
                    <tr>${field(presale ? "Valor preventa" : "Valor", priceHtml)}
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Perforación -->
              <tr>
                <td style="padding:0 24px;">
                  <div style="border-top:2px dashed #4a423e;height:0;line-height:0;font-size:0;">&nbsp;</div>
                </td>
              </tr>

              <!-- Talón: aviso + botón -->
              <tr>
                <td class="px" style="padding:24px 30px 30px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2a0d0b;border:1px solid #6b1714;border-radius:12px;">
                    <tr>
                      <td style="padding:16px 18px;font-family:Inter,Arial,sans-serif;font-size:14.5px;line-height:1.6;color:#f7f4f1;">
                        <strong>Importante:</strong> tu entrada será efectiva y te enviaremos tu <strong>ticket de acceso</strong> cuando se confirme el pago. Los cupos son limitados.
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                    <tr>
                      <td align="center" bgcolor="#b70000" style="border-radius:10px;background:#b70000;background-image:linear-gradient(135deg,#d21a1a,#5e0000);">
                        <a href="${esc(payUrl)}" target="_blank" style="display:block;padding:17px 24px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Finalizar inscripción — Pagar</a>
                      </td>
                    </tr>
                  </table>
                  <div style="font-family:Inter,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#8f8680;text-align:center;padding-top:12px;">
                    Pago seguro a través de Hotmart. Si ya pagaste, puedes ignorar este botón.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td class="px" style="padding:28px 8px 0;font-family:Inter,Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#8f8680;text-align:center;">
            ¿Dudas? Responde este correo o escríbenos a <a href="mailto:${REPLY_TO}" style="color:#d21a1a;text-decoration:none;">${REPLY_TO}</a>.<br>
            <a href="${SITE}" style="color:#ada39a;text-decoration:underline;">harmonyontour.sanamaro.cl</a><br><br>
            © 2026 Harmony Instituto Internacional · Grupo Educacional San Amaro<br>
            Recibes este correo porque te preinscribiste en Harmony On Tour Chile 2026.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    `¡Hola${hola ? ", " + hola : ""}! Tu preinscripción a Harmony On Tour Chile 2026 quedó registrada.`,
    "",
    `Sede: ${info.ciudad} (Edición ${info.edicion}, presencial)`,
    `Fecha: ${info.fecha}`,
    "Horario: 10:00 a 14:00 hrs",
    `Speakers: ${info.speakers.join(" · ")}`,
    "Lugar: la dirección exacta te llegará junto con tu ticket de acceso.",
    `Valor: ${price} CLP${presale ? ` (preventa hasta el 15 de octubre; luego ${PRICE_REGULAR})` : ""}`,
    "",
    "IMPORTANTE: tu entrada será efectiva y te enviaremos tu ticket de acceso cuando se confirme el pago.",
    "",
    `Finalizar inscripción — Pagar: ${payUrl}`,
    "",
    `¿Dudas? Responde este correo o escríbenos a ${REPLY_TO}.`,
    "Harmony Instituto Internacional · harmonyontour.sanamaro.cl",
  ].join("\n");

  return { subject, html, text };
}

async function sendConfirmationEmail({ to, nombre, sede, payUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY no configurada: se omite el correo de confirmación.");
    return { sent: false, reason: "no-api-key" };
  }

  const { subject, html, text } = buildConfirmationEmail({ nombre, sede, payUrl });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], bcc: [BCC], reply_to: REPLY_TO, subject, html, text }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Resend rechazó el correo:", res.status, detail.slice(0, 300));
      return { sent: false, reason: `resend-${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("Error enviando correo de confirmación:", err.message);
    return { sent: false, reason: "error" };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { buildConfirmationEmail, sendConfirmationEmail, SEDES };
