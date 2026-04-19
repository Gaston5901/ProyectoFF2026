import { pgQuery } from '../database/postgres.js';

function mapProductoRow(row) {
  if (!row) return row;
  return {
    id: String(row.id),
    nombre: row.nombre,
    precio: Number(row.precio),
    descripcion: row.descripcion,
    imagen: row.imagen_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const obtenerProductos = async (_req, res) => {
  try {
    const { rows } = await pgQuery('SELECT * FROM productos ORDER BY id ASC');
    return res.json(rows.map(mapProductoRow));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

export const obtenerProducto = async (req, res) => {
  try {
    const { rows } = await pgQuery('SELECT * FROM productos WHERE id = $1 LIMIT 1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    return res.json(mapProductoRow(rows[0]));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

export const crearProducto = async (req, res) => {
  try {
    const { nombre, precio, descripcion, imagen } = req.body;
    const { rows } = await pgQuery(
      `INSERT INTO productos (nombre, precio, descripcion, imagen_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [String(nombre || '').trim(), Number(precio), String(descripcion || ''), String(imagen || '')]
    );
    return res.status(201).json(mapProductoRow(rows[0]));
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
};

export const actualizarProducto = async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, precio, descripcion, imagen } = req.body;
    const { rows } = await pgQuery(
      `UPDATE productos
       SET nombre = COALESCE($2, nombre),
           precio = COALESCE($3, precio),
           descripcion = COALESCE($4, descripcion),
           imagen_url = COALESCE($5, imagen_url),
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        nombre != null ? String(nombre).trim() : null,
        precio != null ? Number(precio) : null,
        descripcion != null ? String(descripcion) : null,
        imagen != null ? String(imagen) : null,
      ]
    );
    if (!rows[0]) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    return res.json(mapProductoRow(rows[0]));
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
};

export const eliminarProducto = async (req, res) => {
  try {
    const { rowCount } = await pgQuery('DELETE FROM productos WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    return res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};
