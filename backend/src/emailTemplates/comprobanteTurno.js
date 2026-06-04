
// Plantilla HTML del email de comprobante de turno.
module.exports = function comprobanteTurnoTemplate({ nombre, servicios, seña, total, pagoId, fecha, hora, extras }) {
  const TZ = 'America/Argentina/Buenos_Aires';
  const nombreSafe = String(nombre || '').trim() || 'cliente';

  // Normaliza la hora para mostrarla siempre con formato HH:MM.
  const normalizeHora = (value) => {
    let h = String(value || '').trim();
    if (!h) return '';
    // HH:MM:SS -> HH:MM
    if (/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(h)) h = h.slice(0, 5);
    // H:M -> HH:MM
    if (/^\d{1,2}:\d{1,2}$/.test(h)) {
      const [hh, mm] = h.split(':');
      h = hh.padStart(2, '0') + ':' + mm.padStart(2, '0');
    }
    return h;
  };

  // Convierte la fecha a formato corto dd/mm/yyyy para el email.
  const formatDateShort = (value) => {
    if (!value) return '';

    // Date -> dd/mm/yyyy
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return '';
      return new Intl.DateTimeFormat('es-AR', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(value);
    }

    const raw = String(value).trim();
    if (!raw) return '';

    // yyyy-mm-dd[...]
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const iso = raw.slice(0, 10);
      const [anio, mes, dia] = iso.split('-');
      return `${dia}/${mes}/${anio}`;
    }

    // Fallback: intentar parsear
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('es-AR', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    }

    return raw;
  };

  const fechaFormateada = formatDateShort(fecha);
  const horaFormateada = normalizeHora(hora);
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7f7; padding: 0; margin: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f7f7f7; padding: 0; margin: 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 32px auto; background: #fff; border-radius: 14px; box-shadow: 0 2px 8px #0001; padding: 0;">
            <tr>
              <td align="center" style="padding: 32px 24px 16px 24px;">
                <img src='https://as1.ftcdn.net/jpg/01/84/52/90/1000_F_184529032_aXpa7HXDQhY3Rtcb8oBxV7K0GXl0P2mp.jpg' alt='Delfina Nails Studio' style='width: 120px; border-radius: 50%; margin-bottom: 8px; display: block;'>
                <h2 style="color: #d13fa0; margin: 16px 0 8px 0; font-size: 24px;">¡Tu turno fue reservado con éxito!</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 8px 24px;">
                <p style="font-size: 16px; color: #333; margin: 0 0 8px 0;">Hola <b>${nombreSafe}</b>,</p>
                <p style="font-size: 15px; color: #333; margin: 0 0 16px 0;">Te confirmamos que tu reserva fue realizada correctamente. Aquí tienes los detalles:</p>
                <ul style="padding-left:18px; margin:0 0 10px 0;">
                  ${servicios.map(s => `<li style='margin-bottom:4px;'><b>${s.title || s.nombre}</b> - $${s.unit_price || s.precio}</li>`).join('')}
                </ul>
                <!-- Resumen del turno y datos de pago -->
                <div style="font-size:15px;margin:10px 0 0 0;">
                  <b>Seña pagada:</b> <span style="color:#388e3c">$${seña}</span><br>
                  <b>Total del turno:</b> <span style="color:#d13fa0">$${total}</span><br>
                  <b>ID de pago:</b> <span style="color:#888">${pagoId}</span><br>
                  <b>Fecha:</b> <span style="color:#222">${fechaFormateada}</span>
                  ${horaFormateada && horaFormateada !== '-' ? `<b> Hora:</b> <span style="color:#222">${horaFormateada}</span>` : ''}
                </div>
                <hr style="border:none;height:1px;background:linear-gradient(to right,transparent,#d13fa0,transparent);margin:18px 0;" />
                <!-- Bloque opcional con usuario y contraseña generados automáticamente -->
                ${extras ? `<div style='margin:16px 0 12px 0;padding:0;background:none;border-radius:0;display:block;max-width:98vw;'>
                  <div style='font-size:15px;color:#d13fa0;font-weight:600;margin-bottom:8px;'>¡Ya tienes tu cuenta!</div>
                  <div style='font-size:15px;color:#333;margin-bottom:6px;'>Este es tu usuario y contraseña para iniciar sesión:</div>
                  <div style='background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:10px 14px;margin-bottom:8px;'>
                    <span style='font-size:15px;color:#333;'>Usuario: <b style='color:#d13fa0;'>${extras.usuario}</b></span>
                  </div>
                  <div style='background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:10px 14px;margin-bottom:8px;'>
                    <span style='font-size:15px;color:#333;'>Contraseña: <b style='color:#d13fa0;'>${extras.password}</b></span>
                  </div>
                  <a href="https://proyecto-ff-2026.vercel.app/login" style="margin-top:10px;color:#fff;background:#d13fa0;padding:8px 18px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:15px;">Iniciar sesión</a>
                  <div style='font-size:12px;color:#888;margin-top:6px;text-align:left;'>Puedes cambiar la contraseña luego desde tu perfil.</div>
                </div>` : ''}
                <p style="font-size:15px;color:#333;margin:18px 0 0 0;">Recordá llegar 5 minutos antes. ¡Te esperamos!</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 0 24px 0; color: #aaa; font-size: 13px;">
                © ${new Date().getFullYear()} Delfina Nails Studio
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <style>
      @media only screen and (max-width: 600px) {
        table[width="100%"] > tr > td > table {
          max-width: 98% !important;
          padding: 0 !important;
        }
        td[align="center"] img {
          width: 60px !important;
        }
        td[align="center"] h2 {
          font-size: 20px !important;
        }
        td[align="center"] a {
          font-size: 15px !important;
          padding: 12px 18px !important;
        }
      }
    </style>
  </div>
  `;
};
