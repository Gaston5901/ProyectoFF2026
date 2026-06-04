require("dotenv/config");

const https = require("https");

// Plantillas HTML usadas para los distintos correos del sistema.
const comprobanteTurnoTemplate = require("../emailTemplates/comprobanteTurno");
const turnoReprogramadoTemplate = require("../emailTemplates/turnoReprogramado");
const recuperarPasswordTemplate = require("../emailTemplates/recuperarPassword");

// El proveedor se elige por variable de entorno y puede caer en modo automático.
const provider = String(process.env.EMAIL_PROVIDER || "auto").toLowerCase();

// Flags para saber qué servicios de email están disponibles.
const hasResend = Boolean(process.env.RESEND_API_KEY);
const hasSmtp = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const hasBrevo = Boolean(process.env.BREVO_API_KEY);

// Separa nombre y email si el from viene en formato "Nombre <mail@dominio>".
function parseFrom(fromValue) {
  const raw = String(fromValue || "").trim();
  const match = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match) {
    const name = match[1]?.trim();
    const email = match[2]?.trim();
    return { name: name || undefined, email };
  }
  return { name: undefined, email: raw };
}

// Inicializa el cliente Resend si está configurado.
let resendClient = null;
if (provider === "resend" || (provider === "auto" && hasResend)) {
  try {
    // eslint-disable-next-line global-require
    const { Resend } = require("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
    console.log("Email provider: Resend");
  } catch (e) {
    console.error("No se pudo inicializar Resend:", e?.message || e);
  }
}

// Inicializa SMTP como alternativa cuando está configurado.
let transporter = null;
if (provider === "smtp" || (provider === "auto" && hasSmtp)) {
  // Fallback SMTP (puede fallar en Render por bloqueo de puertos)
  // eslint-disable-next-line global-require
  const nodemailer = require("nodemailer");
  const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
  const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
  const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE, // true para 465, false para 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
  });

  transporter
    .verify()
    .then(() => console.log("SMTP listo"))
    .catch((e) => console.error("Error SMTP verify:", e?.message || e));
}

const defaultFrom = process.env.EMAIL_FROM || "Delfina Nails Studio <onboarding@resend.dev>";

function normalizeTo(to) {
  if (Array.isArray(to)) {
    return to.map((t) => String(t || "").trim()).filter(Boolean);
  }
  return String(to || "").trim();
}

function httpPostJson({ url, headers, body, timeoutMs = 20000 }) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const data = JSON.stringify(body);

    const req = https.request(
      {
        method: "POST",
        hostname: requestUrl.hostname,
        path: requestUrl.pathname + requestUrl.search,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          if (ok) return resolve({ status: res.statusCode, body: raw });
          const msg = raw || res.statusMessage || "HTTP error";
          return reject(new Error(`HTTP ${res.statusCode}: ${msg}`));
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`HTTP timeout ${timeoutMs}ms`));
    });

    req.write(data);
    req.end();
  });
}

async function sendEmailViaBrevo({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("Falta BREVO_API_KEY");
  }

  const fromParsed = parseFrom(defaultFrom);
  if (!fromParsed.email) {
    throw new Error("EMAIL_FROM inválido");
  }

  const toArray = Array.isArray(to) ? to : [to];
  const payload = {
    sender: {
      email: fromParsed.email,
      ...(fromParsed.name ? { name: fromParsed.name } : {}),
    },
    to: toArray.map((email) => ({ email })),
    subject,
    htmlContent: html,
  };

  await httpPostJson({
    url: "https://api.brevo.com/v3/smtp/email",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      Accept: "application/json",
    },
    body: payload,
    timeoutMs: 20000,
  });
}

async function sendEmail({ to, subject, html }) {
  const toNorm = normalizeTo(to);
  if (!toNorm || (Array.isArray(toNorm) && toNorm.length === 0)) {
    throw new Error("Destinatario (to) vacío");
  }

  // 0) Brevo (HTTP API) — ideal para Render porque no usa SMTP
  if (provider === "brevo" || (provider === "auto" && hasBrevo)) {
    await sendEmailViaBrevo({
      to: toNorm,
      subject,
      html,
    });
    return;
    // Remitente por defecto si no se define EMAIL_FROM.
  }

    // Normaliza el destinatario para aceptar string o array.
  // 1) Intentar Resend si está configurado
  if (resendClient) {
    try {
      await resendClient.emails.send({
        from: defaultFrom,
        to: toNorm,
        subject,
    // Hace un POST JSON simple usando https nativo.
        html,
      });
      return;
    } catch (e) {
      // En plan 'auto', fall back a SMTP si existe.
      if (provider !== "auto" || !transporter) throw e;
      console.error("Resend falló, intentando SMTP:", e?.message || e);
    }
  }

  // Envía correo usando la API HTTP de Brevo.
  // 2) SMTP
  if (!transporter) {
    throw new Error("No hay proveedor de email configurado (SMTP o Resend)");
  }

  await transporter.sendMail({
// Envía un correo eligiendo Brevo, Resend o SMTP según la configuración.
    from: defaultFrom,
    to: toNorm,
    subject,
    html,
  });
}

// Envia el correo de comprobante cuando se reserva un turno.
async function enviarComprobanteTurno({
  to,
  nombre,
  servicios,
  seña,
  total,
  pagoId,
  fecha,
  hora,
  extras,
  restoAPagar,
}) {
  await sendEmail({
    to,
    subject: "¡Tu turno fue reservado con éxito!",
    html: comprobanteTurnoTemplate({
      nombre,
      servicios,
      seña,
      total,
      pagoId,
      fecha,
      hora,
      extras,
      restoAPagar,
    }),
  });
}

// Envia el correo cuando un turno se reprograma.
async function enviarTurnoReprogramado({
  to,
  nombre,
  servicio,
  fechaAnterior,
  horaAnterior,
  fechaNueva,
  horaNueva,
  montoTotal,
  montoPagado,
  restoAPagar,
  pagoId,
}) {
  await sendEmail({
    to,
    subject: "Tu turno fue reprogramado",
    html: turnoReprogramadoTemplate({
      nombre,
      servicio,
      fechaAnterior,
      horaAnterior,
      fechaNueva,
      horaNueva,
      montoTotal,
      montoPagado,
      restoAPagar,
      pagoId,
    }),
  });
}

// Envia el correo de recuperación de contraseña con token temporal.
async function sendPasswordRecoveryEmail(to, token) {
  const minutos = 10;
  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = `${frontend}/recuperar?token=${token}`;
  await sendEmail({
    to,
    subject: "Recuperación de contraseña",
    html: recuperarPasswordTemplate({ resetUrl, minutos }),
  });
}

// Exporta las funciones que usa el resto de la app.
module.exports = {
  enviarComprobanteTurno,
  enviarTurnoReprogramado,
  sendPasswordRecoveryEmail,
};
