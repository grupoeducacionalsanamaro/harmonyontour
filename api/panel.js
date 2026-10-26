// Serverless function (Vercel, Node runtime): API del panel privado de postulaciones (Guayaquil).
//
//   POST /api/panel?op=login    { role, password }  → abre sesión (cookie HttpOnly)
//   POST /api/panel?op=logout                       → cierra sesión
//   GET  /api/panel?op=sesion                       → rol de la sesión actual
//   GET  /api/panel?op=lista                        → postulaciones + resumen de cupos
//   POST /api/panel?op=accion   { id, accion }      → aprobar | espera | rechazar | revision | reenviar
//
// Requiere PANEL_PASSWORD (contraseña compartida), JOTFORM_API_KEY y RESEND_API_KEY.

const {
  ROLES, CUPO, ESTADOS,
  passwordOk, createSession, readSession, sessionCookie, originOk, SESSION_MS,
  confirmToken, jotformUpdate, listPostulaciones, ocupaCupo, nextCode, stamp,
} = require("./_lib/panel");
const { sendApprovalEmail } = require("./_lib/email-aprobacion");

const SITE = "https://harmonyontour.sanamaro.cl";

// Intentos de ingreso por IP (por instancia): frena a quien pruebe contraseñas.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 8;
const attempts = new Map();

function tooManyAttempts(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < LOGIN_WINDOW_MS);
  attempts.set(ip, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length >= LOGIN_MAX;
}

function clientIp(req) {
  return String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || "").split(",")[0].trim();
}

function body(req) {
  return req.body && typeof req.body === "object" ? req.body : {};
}

function resumen(list) {
  const count = (estado) => list.filter((p) => p.estado === estado).length;
  const aprobados = count(ESTADOS.aprobado);
  const confirmados = count(ESTADOS.confirmado);
  return {
    total: list.length,
    revision: count(ESTADOS.revision),
    aprobados,
    confirmados,
    espera: count(ESTADOS.espera),
    rechazados: count(ESTADOS.rechazado),
    ocupados: aprobados + confirmados,
    cupo: CUPO,
  };
}

const ACCIONES = {
  aprobar: ESTADOS.aprobado,
  espera: ESTADOS.espera,
  rechazar: ESTADOS.rechazado,
  revision: ESTADOS.revision,
};

const VERBOS = {
  aprobar: "Aprobado",
  espera: "Lista de espera",
  rechazar: "No aprobado",
  revision: "Devuelto a revisión",
  reenviar: "Correo reenviado",
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const op = String((req.query && req.query.op) || "");

  if (!process.env.PANEL_PASSWORD) {
    res.status(503).json({ ok: false, error: "El panel aún no está configurado (falta PANEL_PASSWORD en Vercel)." });
    return;
  }
  if (req.method === "POST" && !originOk(req)) {
    res.status(403).json({ ok: false, error: "Origen no permitido." });
    return;
  }

  // ----- Ingreso / salida -----
  if (op === "login" && req.method === "POST") {
    const ip = clientIp(req);
    if (tooManyAttempts(ip)) {
      res.status(429).json({ ok: false, error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." });
      return;
    }
    const { role, password } = body(req);
    if (!ROLES[role]) {
      res.status(400).json({ ok: false, error: "Selecciona tu rol." });
      return;
    }
    if (!passwordOk(String(password || ""))) {
      attempts.get(ip).push(Date.now());
      res.status(401).json({ ok: false, error: "Contraseña incorrecta." });
      return;
    }
    res.setHeader("Set-Cookie", sessionCookie(createSession(role), Math.floor(SESSION_MS / 1000)));
    res.status(200).json({ ok: true, role, roleLabel: ROLES[role] });
    return;
  }
  if (op === "logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", sessionCookie("", 0));
    res.status(200).json({ ok: true });
    return;
  }

  const session = readSession(req);
  if (!session) {
    res.status(401).json({ ok: false, error: "Sesión no válida o expirada." });
    return;
  }

  if (op === "sesion" && req.method === "GET") {
    res.status(200).json({ ok: true, role: session.role, roleLabel: ROLES[session.role] });
    return;
  }

  const apiKey = process.env.JOTFORM_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: "Falta JOTFORM_API_KEY." });
    return;
  }

  try {
    if (op === "lista" && req.method === "GET") {
      const { list } = await listPostulaciones(apiKey);
      res.status(200).json({ ok: true, role: session.role, roleLabel: ROLES[session.role], resumen: resumen(list), postulaciones: list });
      return;
    }

    if (op === "accion" && req.method === "POST") {
      const { id, accion } = body(req);
      if (!/^\d+$/.test(String(id || "")) || !(ACCIONES[accion] || accion === "reenviar")) {
        res.status(400).json({ ok: false, error: "Acción no válida." });
        return;
      }

      const { ids, list } = await listPostulaciones(apiKey);
      const item = list.find((p) => p.id === String(id));
      if (!item) {
        res.status(404).json({ ok: false, error: "No se encontró la postulación." });
        return;
      }

      const quien = `${VERBOS[accion]} por ${ROLES[session.role]} · ${stamp()}`;
      const yaAprobado = ocupaCupo(item.estado);
      let codigo = item.codigo;
      let mail = null;

      if (accion === "reenviar") {
        if (!yaAprobado || !codigo) {
          res.status(400).json({ ok: false, error: "Solo se puede reenviar el correo a postulaciones aprobadas." });
          return;
        }
      } else if (accion === "aprobar") {
        if (yaAprobado) {
          res.status(200).json({ ok: true, sinCambios: true, mensaje: "Esta postulación ya estaba aprobada." });
          return;
        }
        if (list.filter((p) => ocupaCupo(p.estado)).length >= CUPO) {
          res.status(409).json({ ok: false, error: `El cupo de ${CUPO} personas está completo. Mueve a alguien a lista de espera para liberar un lugar.` });
          return;
        }
        codigo = codigo || nextCode(list);
      }

      const fields = { [ids.revisado]: quien };
      if (ACCIONES[accion]) fields[ids.estado] = ACCIONES[accion];
      if (codigo && codigo !== item.codigo) fields[ids.codigo] = codigo;
      await jotformUpdate(item.id, fields, apiKey);

      if (accion === "aprobar" || accion === "reenviar") {
        const confirmUrl = `${SITE}/api/confirmar?id=${item.id}&t=${confirmToken(item.id)}`;
        mail = await sendApprovalEmail({ to: item.email, nombre: item.nombre, codigo, confirmUrl });
      }

      res.status(200).json({
        ok: true,
        estado: ACCIONES[accion] || item.estado,
        codigo,
        revisado: quien,
        emailSent: mail ? mail.sent : undefined,
      });
      return;
    }

    res.status(404).json({ ok: false, error: "Operación no encontrada." });
  } catch (err) {
    console.error("panel error:", err);
    res.status(502).json({ ok: false, error: "No pudimos completar la operación con Jotform. Inténtalo de nuevo." });
  }
};
