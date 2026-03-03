
// Plantilla de email de comprobante de turno
module.exports = function comprobanteTurnoTemplate({ nombre, servicios, seña, total, pagoId, fecha, hora, extras }) {
  // Mostrar la fecha como dd/mm/yyyy si viene en formato yyyy-mm-dd
  let fechaFormateada = fecha;
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [anio, mes, dia] = fecha.split('-');
    fechaFormateada = `${dia}/${mes}/${anio}`;
  }
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
                <p style="font-size: 16px; color: #333; margin: 0 0 8px 0;">Hola <b>${nombre}</b>,</p>
                <p style="font-size: 15px; color: #333; margin: 0 0 16px 0;">Te confirmamos que tu reserva fue realizada correctamente. Aquí tienes los detalles:</p>
                <ul style="padding-left:18px; margin:0 0 10px 0;">
                  ${servicios.map(s => `<li style='margin-bottom:4px;'><b>${s.title || s.nombre}</b> - $${s.unit_price || s.precio}</li>`).join('')}
                </ul>
                <div style="font-size:15px;margin:10px 0 0 0;">
                  <b>Seña pagada:</b> <span style="color:#388e3c">$${seña}</span><br>
                  <b>Total del turno:</b> <span style="color:#d13fa0">$${total}</span><br>
                  <b>ID de pago:</b> <span style="color:#888">${pagoId}</span><br>
                  <b>Fecha:</b> <span style="color:#222">${fechaFormateada}</span>
                  ${hora && hora !== '-' ? `<b> Hora:</b> <span style="color:#222">${hora}</span>` : ''}
                </div>
                <hr style="border:none;height:1px;background:linear-gradient(to right,transparent,#d13fa0,transparent);margin:18px 0;" />
                ${extras ? `<div style='margin:16px 0 12px 0;padding:0;background:none;border-radius:0;display:block;max-width:98vw;'>
                  <div style='font-size:15px;color:#d13fa0;font-weight:600;margin-bottom:8px;'>¡Ya tienes tu cuenta!</div>
                  <div style='font-size:15px;color:#333;margin-bottom:6px;'>Este es tu usuario y contraseña para iniciar sesión:</div>
                  <div style='background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:10px 14px;margin-bottom:8px;'>
                    <span style='font-size:15px;color:#333;'>Usuario: <b style='color:#d13fa0;'>${extras.usuario}</b></span>
                  </div>
                  <div style='background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:10px 14px;margin-bottom:8px;'>
                    <span style='font-size:15px;color:#333;'>Contraseña: <b style='color:#d13fa0;'>${extras.password}</b></span>
                  </div>
                  <a href="https://tusitio.com/login" style="margin-top:10px;color:#fff;background:#d13fa0;padding:8px 18px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:15px;">Iniciar sesión</a>
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
