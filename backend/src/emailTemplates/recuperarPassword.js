// Plantilla HTML profesional para email de recuperación de contraseña
module.exports = function recuperarPasswordTemplate({ resetUrl, minutos }) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7f7; padding: 0; margin: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f7f7f7; padding: 0; margin: 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 32px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px #0001; padding: 0;">
            <tr>
              <td align="center" style="padding: 32px 24px 16px 24px;">
                <img src='https://as1.ftcdn.net/jpg/01/84/52/90/1000_F_184529032_aXpa7HXDQhY3Rtcb8oBxV7K0GXl0P2mp.jpg' alt='Delfina Nails Studio' style='width: 140px; border-radius: 50%; margin-bottom: 8px; display: block;'>
                <h2 style="color: #e94057; margin: 16px 0 8px 0; font-size: 24px;">Recuperación de contraseña</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 8px 24px;">
                <p style="font-size: 16px; color: #333; margin: 0 0 8px 0;">Recibimos una solicitud para restablecer tu contraseña en <b>Delfina Nails Studio</b>.</p>
                <p style="font-size: 15px; color: #333; margin: 0 0 16px 0;">Haz click en el siguiente botón para crear una nueva contraseña. Este enlace es válido por <b>${minutos} minutos</b>:</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 24px 24px 24px;">
                <a href="${resetUrl}" style="background: linear-gradient(90deg,#e94057,#8a2387); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 17px; font-weight: 600; letter-spacing: 1px; display: inline-block;">Restablecer contraseña</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 24px 24px;">
                <p style="font-size: 14px; color: #888; margin: 0;">Si no solicitaste este cambio, puedes ignorar este correo. Por seguridad, el enlace expirará automáticamente.</p>
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
