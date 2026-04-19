import { pgQuery } from '../database/postgres.js';

function mapCarruselRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    imagenes: Array.isArray(row.imagenes) ? row.imagenes : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const obtenerCarrusel = async (_req, res) => {
  try {
    const { rows } = await pgQuery('SELECT * FROM carrusel WHERE id = 1 LIMIT 1');
    if (!rows[0]) {
      // debería existir, pero por las dudas
      const ins = await pgQuery('INSERT INTO carrusel (id) VALUES (1) ON CONFLICT (id) DO NOTHING RETURNING *');
      return res.json(mapCarruselRow(ins.rows[0] || { id: 1, imagenes: [] }));
    }
    return res.json(mapCarruselRow(rows[0]));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

export const actualizarCarrusel = async (req, res) => {
  try {
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
