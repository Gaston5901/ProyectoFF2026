export function recuperarPasswordHTML({ nombre, token }) {
  return `<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Recuperar Contraseña</title></head><body style='font-family:Arial,sans-serif;background:#f1f1f1;padding:30px;'>
  <div style='max-width:560px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;'>
    <div style='background:#ff8aa5;color:#fff;padding:20px;'>
      <h2 style='margin:0'>Recuperación de Contraseña</h2>
    </div>
    <div style='padding:24px;font-size:15px;color:#333;'>
      <p>Hola <strong>${nombre}</strong>, solicitaste recuperar tu contraseña.</p>
      <p>Usa el siguiente código para restablecerla (válido 30 minutos):</p>
      <div style='font-size:28px;letter-spacing:4px;font-weight:bold;background:#ffe6ec;padding:16px;text-align:center;border-radius:6px;'>${token}</div>
      <p style='margin-top:18px;'>Ingresa este código en la página de recuperación para continuar.</p>
    </div>
    <div style='background:#fafafa;padding:12px;text-align:center;font-size:12px;color:#777;'>Si no pediste este correo ignóralo.</div>
  </div>
</body></html>`;
}
