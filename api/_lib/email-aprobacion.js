// Correo "¡Tu cupo fue aprobado!" (postulación Guayaquil): ticket con código personal,
// botón para confirmar asistencia (72 horas) y enlace para agregar al calendario.
// Lo envía el panel privado al aprobar una postulación.

const { sendEmail, esc, SEDES, SITE, REPLY_TO } = require("./email");

const INFO = SEDES["Guayaquil — Ecuador"];

// 28 nov 2026, 10:00–14:00 hora de Ecuador (UTC-5) = 15:00–19:00 UTC.
const CALENDAR_URL = "https://calendar.google.com/calendar/render?" + new URLSearchParams({
  action: "TEMPLATE",
  text: "Harmony On Tour Guayaquil",
  dates: "20261128T150000Z/20261128T190000Z",
  location: `${INFO.lugar}, Guayaquil, Ecuador`,
  details: `Harmony On Tour LATAM 2026 · Edición 03 Guayaquil. Cronograma: ${SITE}/?cronograma=guayaquil#cronograma`,
}).toString();

function field(label, value) {
  return `
                  <tr><td valign="top" style="padding:0 0 18px 0;">
                    <div style="font-family:'JetBrains Mono',Consolas,'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ada39a;">${label}</div>
                    <div style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#f7f4f1;line-height:1.4;padding-top:4px;">${value}</div>
                  </td></tr>`;
}

function buildApprovalEmail({ nombre, codigo, confirmUrl }) {
  const hola = String(nombre).trim().split(/\s+/)[0] || "";
  const subject = "¡Tu cupo para Harmony On Tour Guayaquil fue aprobado!";
  const preheader = `Tu código de acceso es ${codigo}. Confirma tu asistencia dentro de las próximas 72 horas.`;
  const agendaUrl = `${SITE}/?cronograma=guayaquil#cronograma`;

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
    .code{font-size:34px!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#0a0908;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0a0908;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0908" style="background:#0a0908;">
  <tr>
    <td align="center" style="padding:28px 12px 40px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

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

        <tr>
          <td class="px" style="padding:0 8px 26px;">
            <div style="font-family:Oswald,'Arial Narrow',Arial,sans-serif;font-size:30px;font-weight:700;line-height:1.1;color:#f7f4f1;text-transform:uppercase;">¡Felicitaciones${hola ? ", " + esc(hola) : ""}! Tu cupo fue aprobado</div>
            <div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.65;color:#ada39a;padding-top:14px;">
              Nuestro equipo revisó tu postulación y tienes un lugar reservado en <strong style="color:#f7f4f1;">Harmony On Tour LATAM 2026 · Guayaquil</strong>. Este es tu ticket de acceso personal.
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#171412" style="background:#171412;border:1px solid #6b5a12;border-radius:18px;">
              <tr>
                <td class="px" bgcolor="#5e0000" style="background:#5e0000;background-image:linear-gradient(135deg,#7a0707 0%,#3a0806 60%,#1c0a09 100%);border-radius:17px 17px 0 0;padding:26px 30px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="font-family:'JetBrains Mono',Consolas,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e8dcd8;">Harmony On Tour · LATAM 2026</td>
                    <td align="right"><span style="display:inline-block;font-family:'JetBrains Mono',Consolas,monospace;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1a1300;background:#ffd100;padding:4px 9px;border-radius:4px;">Cupo aprobado</span></td>
                  </tr></table>
                  <div class="city" style="font-family:Oswald,'Arial Narrow',Impact,Arial,sans-serif;font-size:50px;font-weight:700;line-height:1;color:#f7f4f1;text-transform:uppercase;padding-top:18px;">Guayaquil</div>
                  <div style="font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e8dcd8;padding-top:10px;">Edición 03 · Ecuador · Presencial</div>
                </td>
              </tr>

              <tr>
                <td class="px" style="padding:26px 30px 6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${field("Asistente", esc(nombre))}
                    ${field("Fecha", esc(INFO.fecha))}
                    ${field("Horario", "10:00 a 14:00 hrs")}
                    ${field("Lugar", `${esc(INFO.lugar)}<br><span style="font-size:13px;font-weight:500;color:#ada39a;">Guayaquil, Ecuador</span><br><a href="${esc(INFO.mapa)}" target="_blank" style="font-size:13.5px;font-weight:600;color:#d21a1a;text-decoration:none;">Ver ubicación &rarr;</a>`)}
                    ${field("Entrada", "Liberada (sin costo)")}
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 24px;">
                  <div style="border-top:2px dashed #4a423e;height:0;line-height:0;font-size:0;">&nbsp;</div>
                </td>
              </tr>

              <tr>
                <td class="px" align="center" style="padding:24px 30px 30px;">
                  <div style="font-family:'JetBrains Mono',Consolas,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ada39a;">Tu código de acceso</div>
                  <div class="code" style="font-family:'JetBrains Mono',Consolas,'Courier New',monospace;font-size:40px;font-weight:700;letter-spacing:4px;color:#ffd84d;padding:8px 0 4px;">${esc(codigo)}</div>
                  <div style="font-family:Inter,Arial,sans-serif;font-size:13px;color:#8f8680;">Preséntalo en el ingreso junto a tu nombre.</div>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;background:#2a2208;border:1px solid #6b5a12;border-radius:12px;">
                    <tr>
                      <td style="padding:16px 18px;font-family:Inter,Arial,sans-serif;font-size:14.5px;line-height:1.6;color:#f7f4f1;text-align:left;">
                        <strong>Importante:</strong> confirma tu asistencia dentro de las próximas <strong>72 horas</strong>. Si no confirmas, tu cupo podría liberarse para otra persona en lista de espera.
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                    <tr>
                      <td align="center" bgcolor="#b70000" style="border-radius:10px;background:#b70000;background-image:linear-gradient(135deg,#d21a1a,#5e0000);">
                        <a href="${esc(confirmUrl)}" target="_blank" style="display:block;padding:17px 24px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Confirmo mi asistencia</a>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                    <tr>
                      <td align="center" width="50%" style="padding-right:6px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="border:1px solid #5a4f4a;border-radius:10px;">
                          <a href="${esc(CALENDAR_URL)}" target="_blank" style="display:block;padding:12px 10px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:13.5px;font-weight:600;color:#f7f4f1;text-decoration:none;">Agregar al calendario</a>
                        </td></tr></table>
                      </td>
                      <td align="center" width="50%" style="padding-left:6px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="border:1px solid #5a4f4a;border-radius:10px;">
                          <a href="${esc(agendaUrl)}" target="_blank" style="display:block;padding:12px 10px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:13.5px;font-weight:600;color:#f7f4f1;text-decoration:none;">Ver cronograma</a>
                        </td></tr></table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px" style="padding:28px 8px 0;font-family:Inter,Arial,sans-serif;font-size:12.5px;line-height:1.7;color:#8f8680;text-align:center;">
            ¿No podrás asistir? Responde este correo para liberar tu cupo a otra persona.<br>
            ¿Dudas? Escríbenos a <a href="mailto:${REPLY_TO}" style="color:#d21a1a;text-decoration:none;">${REPLY_TO}</a>.<br>
            <a href="${SITE}" style="color:#ada39a;text-decoration:underline;">harmonyontour.sanamaro.cl</a><br><br>
            © 2026 Harmony Instituto Internacional · Grupo Educacional San Amaro
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    `¡Felicitaciones${hola ? ", " + hola : ""}! Tu cupo para Harmony On Tour LATAM 2026 · Guayaquil fue aprobado.`,
    "",
    `Asistente: ${nombre}`,
    `Código de acceso: ${codigo} (preséntalo en el ingreso)`,
    `Fecha: ${INFO.fecha} · 10:00 a 14:00 hrs`,
    `Lugar: ${INFO.lugar}, Guayaquil, Ecuador (${INFO.mapa})`,
    "Entrada: liberada (sin costo)",
    "",
    "IMPORTANTE: confirma tu asistencia dentro de las próximas 72 horas. Si no confirmas, tu cupo podría liberarse para otra persona en lista de espera.",
    `Confirmo mi asistencia: ${confirmUrl}`,
    "",
    `Agregar al calendario: ${CALENDAR_URL}`,
    `Cronograma: ${agendaUrl}`,
    "",
    `¿No podrás asistir? Responde este correo para liberar tu cupo. Dudas: ${REPLY_TO}`,
  ].join("\n");

  return { subject, html, text };
}

async function sendApprovalEmail({ to, nombre, codigo, confirmUrl }) {
  return sendEmail({ to, ...buildApprovalEmail({ nombre, codigo, confirmUrl }) });
}

module.exports = { buildApprovalEmail, sendApprovalEmail };
