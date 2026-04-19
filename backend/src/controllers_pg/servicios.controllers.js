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
    return res.status(400).json({ mensaje: error.message });
  }
};

export const obtenerServicios = async (_req, res) => {
  try {
    const { rows } = await pgQuery('SELECT * FROM servicios ORDER BY id ASC');
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
    return res.status(400).json({ mensaje: error.message });
  }
};

export const eliminarServicio = async (req, res) => {
  try {
    const { rowCount } = await pgQuery('DELETE FROM servicios WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    return res.json({ mensaje: 'Servicio eliminado' });
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};
