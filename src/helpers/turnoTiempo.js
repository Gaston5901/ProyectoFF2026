export const esHorarioVencido = (fecha, hora, ahora = new Date()) => {
  if (!fecha || !hora) return false;

  // Separar la hora para poder comparar fecha y hora exactas.
  const [horasStr, minutosStr = '0'] = String(hora).trim().split(':');
  const horas = Number(horasStr);
  const minutos = Number(minutosStr);

  // Si la hora viene mal formada, no se considera vencida.
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return false;

  // Partimos de la fecha del turno a medianoche y luego le agregamos la hora.
  const fechaHora = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(fechaHora.getTime())) return false;

  fechaHora.setHours(horas, minutos, 0, 0);
  // Si el horario ya pasó, el turno queda marcado como vencido.
  return fechaHora <= ahora;
};