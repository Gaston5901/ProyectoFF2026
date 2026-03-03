export function comprobanteTurnoHTML({ nombre, servicios, seña, total, pagoId }) {
  const filas = servicios.map(s => `<tr><td style='padding:8px;border:1px solid #ddd;'>${s.nombre}</td><td style='padding:8px;border:1px solid #ddd;text-align:right;'>$${s.precio.toLocaleString()}</td><td style='padding:8px;border:1px solid #ddd;'>${s.fecha}</td><td style='padding:8px;border:1px solid #ddd;'>${s.hora} hs</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Comprobante de Seña</title></head><body style='font-family:Arial,sans-serif;background:#fafafa;padding:20px;'>
  <div style='max-width:600px;margin:auto;background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden;'>
    <div style='background:linear-gradient(135deg,#ff8aa5,#ffb3c4);color:#fff;padding:24px;'>
      <h1 style='margin:0;font-size:22px;'>Delfina Nails Studio</h1>
      <p style='margin:4px 0 0;'>Comprobante de Seña</p>
    </div>
    <div style='padding:24px;'>
      <p style='font-size:15px;'>Hola <strong>${nombre}</strong>, gracias por reservar. Este es tu comprobante de la seña (50%).</p>
      <table style='width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;'>
        <thead>
          <tr style='background:#ffe6ec;'>
            <th style='padding:8px;border:1px solid #ddd;text-align:left;'>Servicio</th>
            <th style='padding:8px;border:1px solid #ddd;text-align:right;'>Precio</th>
            <th style='padding:8px;border:1px solid #ddd;'>Fecha</th>
            <th style='padding:8px;border:1px solid #ddd;'>Hora</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <div style='margin-top:20px;font-size:14px;'>
        <p><strong>Total:</strong> $${total.toLocaleString()}</p>
        <p><strong>Seña Pagada (50%):</strong> $${seña.toLocaleString()}</p>
        <p><strong>ID de Pago:</strong> ${pagoId}</p>
      </div>
      <p style='margin-top:20px;font-size:13px;color:#555;'>Recordá llegar 5 minutos antes. El resto se abona en el estudio. Barrio San Martín mza A casa 5.</p>
    </div>
    <div style='background:#f9f9f9;padding:12px;text-align:center;font-size:11px;color:#777;'>
      © ${new Date().getFullYear()} Delfina Nails Studio
    </div>
  </div>
</body></html>`;
}
