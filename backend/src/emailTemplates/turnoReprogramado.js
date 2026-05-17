// Plantilla de email: turno reprogramado
module.exports = function turnoReprogramadoTemplate({
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
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const TZ = 'America/Argentina/Buenos_Aires';

  const normalizeHora = (value) => {
    let h = String(value || '').trim();
    if (!h) return '';
    if (/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(h)) h = h.slice(0, 5);
    if (/^\d{1,2}:\d{1,2}$/.test(h)) {
      const [hh, mm] = h.split(':');
      h = hh.padStart(2, '0') + ':' + mm.padStart(2, '0');
    }
    return h;
  };

  const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const d = new Date(`${raw}T00:00:00`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const d = new Date(`${raw.slice(0, 10)}T00:00:00`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const money = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const rounded = Math.round(n * 100) / 100;
    return `$${rounded}`;
  };

  const formatearCorto = (fecha) => {
    const d = toDate(fecha);
    if (d) {
      return new Intl.DateTimeFormat('es-AR', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    }
    const raw = String(fecha || '').trim();
    return raw;
  };

  const formatearConDia = (fecha) => {
    const d = toDate(fecha);
    if (!d) return formatearCorto(fecha);
    const dow = dias[d.getDay()];
    return `${dow} ${formatearCorto(d)}`;
  };

  const fa = formatearConDia(fechaAnterior);
  const fn = formatearConDia(fechaNueva);
  const ha = horaAnterior ? `${normalizeHora(horaAnterior)} hs` : '';
  const hn = horaNueva ? `${normalizeHora(horaNueva)} hs` : '';

  const totalFmt = money(montoTotal);
  const pagadoFmt = money(montoPagado);
  const restoFmt = money(restoAPagar);
  const mostrarPago = Boolean(totalFmt || pagadoFmt || restoFmt || pagoId);

  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7f7; padding: 0; margin: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f7f7f7; padding: 0; margin: 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 32px auto; background: #fff; border-radius: 14px; box-shadow: 0 2px 8px #0001; padding: 0;">
            <tr>
              <td align="center" style="padding: 28px 24px 10px 24px;">
                <img src='https://as1.ftcdn.net/jpg/01/84/52/90/1000_F_184529032_aXpa7HXDQhY3Rtcb8oBxV7K0GXl0P2mp.jpg' alt='Delfina Nails Studio' style='width: 110px; border-radius: 50%; margin-bottom: 8px; display: block;'>
                <h2 style="color: #d13fa0; margin: 14px 0 6px 0; font-size: 22px;">Tu turno fue reprogramado</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 18px 24px;">
                <p style="font-size: 15px; color: #333; margin: 0 0 10px 0;">Hola <b>${nombre || 'Cliente'}</b>,</p>
                <p style="font-size: 14px; color: #333; margin: 0 0 14px 0;">Te confirmamos la reprogramación de tu turno. Estos son los detalles:</p>

                <div style="display: block; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 12px 14px; margin: 0 0 12px 0;">
                  <div style="font-weight: 800; color: #222; margin-bottom: 8px;">Fecha anterior</div>
                  <div style="font-size: 14px; color: #444;">
                    <b>${fa}</b>${horaAnterior ? ` · <b>${ha}</b>` : ''}
                  </div>
                </div>

                <div style="display: block; border: 1px solid rgba(209,63,160,0.25); border-radius: 12px; padding: 12px 14px; margin: 0 0 12px 0; background: rgba(209,63,160,0.06);">
                  <div style="font-weight: 900; color: #d13fa0; margin-bottom: 8px;">Nueva fecha</div>
                  <div style="font-size: 15px; color: #222;">
                    <b>${fn}</b>${horaNueva ? ` · <b>${hn}</b>` : ''}
                  </div>
                </div>

                <div style="border: 1px solid rgba(209,63,160,0.20); border-radius: 12px; padding: 12px 14px; margin: 0 0 12px 0; background: rgba(209,63,160,0.06);">
                  <div style="font-weight: 800; color: #d13fa0; margin-bottom: 6px;">Servicio</div>
                  <div style="font-size: 14px; color: #222; font-weight: 700;">${servicio || 'Servicio'}</div>
                </div>

                ${mostrarPago ? `
                <div style="border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 12px 14px; margin: 0 0 12px 0; background: #fff;">
                  <div style="font-weight: 900; color: #222; margin-bottom: 8px;">Detalle del turno</div>
                  ${totalFmt ? `<div style="font-size: 14px; color: #333; margin: 0 0 4px 0;"><b>Total:</b> <span style="color:#d13fa0; font-weight: 900;">${totalFmt}</span></div>` : ''}
                  ${pagadoFmt ? `<div style="font-size: 14px; color: #333; margin: 0 0 4px 0;"><b>Pagado:</b> <span style="color:#388e3c; font-weight: 900;">${pagadoFmt}</span></div>` : ''}
                  ${restoFmt ? `<div style="font-size: 14px; color: #333; margin: 0 0 4px 0;"><b>Falta abonar:</b> <span style="color:#c62828; font-weight: 900;">${restoFmt}</span></div>` : ''}
                  ${pagoId ? `<div style="font-size: 12px; color: rgba(0,0,0,0.55); margin-top: 6px;">ID de pago: <b>${String(pagoId)}</b></div>` : ''}
                </div>
                ` : ''}

                <p style="font-size: 13px; color: rgba(0,0,0,0.65); margin: 12px 0 0 0;">Tu horario anterior quedó liberado y el nuevo quedó reservado.</p>
                <p style="font-size: 14px; color: #333; margin: 10px 0 0 0;">Si tenés alguna consulta, respondé este mail y te ayudamos.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 0 22px 0; color: #aaa; font-size: 13px;">
                © ${new Date().getFullYear()} Delfina Nails Studio
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
};
