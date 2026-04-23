import { pgQuery } from '../database/postgres.js';

function mapServicioRow(row) {
  if (!row) return row;
  return {
    id: String(row.id),
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio: Number(row.precio),
    duracion: Number(row.duracion_min),
    imagen: row.imagen_url || '',
    activo: row.activo == null ? true : Boolean(row.activo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const crearServicio = async (req, res) => {
  try {
    const { nombre, descripcion, precio, duracion, imagen } = req.body;
    const { rows } = await pgQuery(
      `INSERT INTO servicios (nombre, descripcion, precio, duracion_min, imagen_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        String(nombre || '').trim(),
        descripcion ?? null,
        Number(precio),
        Number(duracion),
        String(imagen || ''),
      ]
    );
    return res.status(201).json(mapServicioRow(rows[0]));
  } catch (error) {
    // unique_violation (servicios_nombre_uq)
    if (error?.code === '23505') {
      return res.status(409).json({ mensaje: 'Ya existe un servicio con ese nombre' });
    }
    return res.status(400).json({ mensaje: error.message });
  }
};

export const obtenerServicios = async (_req, res) => {
  try {
    const { rows } = await pgQuery('SELECT * FROM servicios WHERE activo = true ORDER BY id ASC');
    return res.json(rows.map(mapServicioRow));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

export const obtenerServicio = async (req, res) => {
  try {
    const { rows } = await pgQuery('SELECT * FROM servicios WHERE id = $1 LIMIT 1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    return res.json(mapServicioRow(rows[0]));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

export const actualizarServicio = async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, descripcion, precio, duracion, imagen } = req.body;

    const { rows } = await pgQuery(
      `UPDATE servicios
       SET nombre = COALESCE($2, nombre),
           descripcion = COALESCE($3, descripcion),
           precio = COALESCE($4, precio),
           duracion_min = COALESCE($5, duracion_min),
           imagen_url = COALESCE($6, imagen_url),
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        nombre != null ? String(nombre).trim() : null,
        descripcion != null ? String(descripcion) : null,
        precio != null ? Number(precio) : null,
        duracion != null ? Number(duracion) : null,
        imagen != null ? String(imagen) : null,
      ]
    );

    if (!rows[0]) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    return res.json(mapServicioRow(rows[0]));
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ mensaje: 'Ya existe un servicio con ese nombre' });
    }
    return res.status(400).json({ mensaje: error.message });
  }
};

export const eliminarServicio = async (req, res) => {
  try {
    const id = req.params.id;

    // Si el servicio está referenciado por turnos, no permitir borrado.
    const { rows: usedRows } = await pgQuery(
      'SELECT count(*)::int AS count FROM turnos WHERE servicio_id = $1',
      [id]
    );
    const usedCount = Number(usedRows?.[0]?.count || 0);
    if (usedCount > 0) {
      const { rows } = await pgQuery(
        `UPDATE servicios
         SET activo = false,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (!rows[0]) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
      return res.json({
        mensaje: `Servicio archivado (tenía ${usedCount} turno(s) asociado(s)).`,
        servicio: mapServicioRow(rows[0]),
      });
    }

    const { rowCount } = await pgQuery('DELETE FROM servicios WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    return res.json({ mensaje: 'Servicio eliminado' });
  } catch (error) {
    // foreign_key_violation (por si cambió el schema o hay otras FKs)
    if (error?.code === '23503') {
      return res.status(409).json({ mensaje: 'No se puede eliminar el servicio: está en uso.' });
    }
    return res.status(500).json({ mensaje: error.message });
  }
};
