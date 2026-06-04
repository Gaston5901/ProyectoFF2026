import { pgQuery } from '../database/postgres.js';

// Convierte la fila cruda de PostgreSQL al formato que usa la API.
function mapCarruselRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    imagenes: Array.isArray(row.imagenes) ? row.imagenes : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Devuelve el carrusel principal (id = 1).
export const obtenerCarrusel = async (_req, res) => {
  try {
    // Busca la fila base del carrusel.
    const { rows } = await pgQuery('SELECT * FROM carrusel WHERE id = 1 LIMIT 1');
    if (!rows[0]) {
      // Si no existe, la crea para asegurar que siempre haya una fila.
      const ins = await pgQuery('INSERT INTO carrusel (id) VALUES (1) ON CONFLICT (id) DO NOTHING RETURNING *');
      return res.json(mapCarruselRow(ins.rows[0] || { id: 1, imagenes: [] }));
    }
    return res.json(mapCarruselRow(rows[0]));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

// Actualiza las imágenes del carrusel principal.
export const actualizarCarrusel = async (req, res) => {
  try {
    // Acepta un array de imágenes; si no viene, usa vacío.
    const imagenes = Array.isArray(req.body?.imagenes) ? req.body.imagenes : [];
    const { rows } = await pgQuery(
      `UPDATE carrusel
       SET imagenes = $1,
           updated_at = now()
       WHERE id = 1
       RETURNING *`,
      [imagenes]
    );
    return res.json(mapCarruselRow(rows[0]));
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
};
