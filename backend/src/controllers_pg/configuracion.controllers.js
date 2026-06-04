import { pgQuery } from '../database/postgres.js';

// Convierte una fila cruda de PostgreSQL al formato usado por el frontend/API.
function mapConfigRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    diasLaborales: row.dias_laborales,
    porcentajeSeña: Number(row.porcentaje_senia),
    emailNotificaciones: row.email_notificaciones,
    horariosPorDia: row.horarios_por_dia || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Devuelve la configuración principal (id = 1).
export const obtenerConfiguracion = async (_req, res) => {
  try {
    // Busca la fila única de configuración.
    const { rows } = await pgQuery('SELECT * FROM configuracion WHERE id = 1 LIMIT 1');
    if (!rows[0]) {
      // Si no existe, la crea y luego la vuelve a leer.
      await pgQuery('INSERT INTO configuracion (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
      const again = await pgQuery('SELECT * FROM configuracion WHERE id = 1 LIMIT 1');
      return res.json(mapConfigRow(again.rows[0]));
    }
    return res.json(mapConfigRow(rows[0]));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

// Actualiza parcialmente la configuración principal.
export const actualizarConfiguracion = async (req, res) => {
  try {
    const body = req.body || {};

    // Mantiene los nombres del API en camelCase y los traduce a columnas SQL.
    const { rows } = await pgQuery(
      `UPDATE configuracion
       SET hora_inicio = COALESCE($1, hora_inicio),
           hora_fin = COALESCE($2, hora_fin),
           dias_laborales = COALESCE($3, dias_laborales),
           porcentaje_senia = COALESCE($4, porcentaje_senia),
           email_notificaciones = COALESCE($5, email_notificaciones),
           horarios_por_dia = COALESCE($6, horarios_por_dia),
           updated_at = now()
       WHERE id = 1
       RETURNING *`,
      [
        body.horaInicio ?? null,
        body.horaFin ?? null,
        Array.isArray(body.diasLaborales) ? body.diasLaborales : null,
        body.porcentajeSeña != null ? Number(body.porcentajeSeña) : null,
        body.emailNotificaciones ?? null,
        body.horariosPorDia != null ? body.horariosPorDia : null,
      ]
    );

    return res.json(mapConfigRow(rows[0]));
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
};

// Devuelve solo el objeto horarios_por_dia de la configuración.
export const obtenerHorariosPorDia = async (_req, res) => {
  try {
    // Lee la configuración y devuelve el mapa de horarios.
    const { rows } = await pgQuery('SELECT horarios_por_dia FROM configuracion WHERE id = 1 LIMIT 1');
    return res.json(rows?.[0]?.horarios_por_dia || {});
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

// Reemplaza por completo el mapa horarios_por_dia.
export const actualizarHorariosPorDia = async (req, res) => {
  try {
    // Toma el body como estructura completa de horarios.
    const horariosPorDia = req.body || {};
    const { rows } = await pgQuery(
      `UPDATE configuracion
       SET horarios_por_dia = $1,
           updated_at = now()
       WHERE id = 1
       RETURNING horarios_por_dia`,
      [horariosPorDia]
    );
    return res.json(rows?.[0]?.horarios_por_dia || {});
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
};
