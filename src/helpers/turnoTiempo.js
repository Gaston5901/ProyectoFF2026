export const esHorarioVencido = (fecha, hora, ahora = new Date()) => {
  if (!fecha || !hora) return false;

  const [horasStr, minutosStr = '0'] = String(hora).trim().split(':');
  const horas = Number(horasStr);
  const minutos = Number(minutosStr);

  if (Number.isNaN(horas) || Number.isNaN(minutos)) return false;

  const fechaHora = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(fechaHora.getTime())) return false;

  fechaHora.setHours(horas, minutos, 0, 0);
  return fechaHora <= ahora;
};