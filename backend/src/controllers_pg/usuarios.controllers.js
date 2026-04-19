import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pgQuery } from '../database/postgres.js';
import { sendPasswordRecoveryEmail } from '../helpers/emailSender.cjs';

const getDefaultSuperAdminEmail = () =>
  String(
    process.env.DEFAULT_SUPERADMIN_EMAIL ||
      process.env.DEFAULT_ADMIN_EMAIL ||
      'admin@turnos.com'
  )
    .toLowerCase()
    .trim();

const sanitizeUsuario = (row) => {
  if (!row) return row;
  return {
    id: String(row.id),
    nombre: row.nombre,
    email: row.email,
    username: row.username,
    telefono: row.telefono,
    rol: row.rol,
    suspendido: Boolean(row.suspendido),
    oculto: Boolean(row.oculto),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

async function getUsuarioByEmailOrUsername(emailNorm) {
  const { rows } = await pgQuery(
    `SELECT * FROM usuarios
     WHERE email = $1 OR username = $1
     LIMIT 1`,
    [emailNorm]
  );
  return rows[0] || null;
}

export const obtenerUsuarios = async (_req, res) => {
  try {
    const { rows } = await pgQuery('SELECT * FROM usuarios ORDER BY id ASC');
    return res.json(rows.map(sanitizeUsuario));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

export const obtenerUsuario = async (req, res) => {
  try {
    const { rows } = await pgQuery('SELECT * FROM usuarios WHERE id = $1 LIMIT 1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json(sanitizeUsuario(rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

export const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, telefono, password } = req.body;

    const rolRequested = req.body.rol || 'cliente';
    const isSuperAdmin = req.user?.rol === 'superadmin';
    const rol = isSuperAdmin ? rolRequested : 'cliente';

    const emailNorm = String(email || '').toLowerCase().trim();
    if (!emailNorm) return res.status(400).json({ mensaje: 'Email inválido' });

    const usernameBody = req.body?.username;
    const usernameNorm = String(usernameBody || emailNorm).toLowerCase().trim();

    const existing = await getUsuarioByEmailOrUsername(emailNorm);
    if (existing) {
      return res
        .status(200)
        .json({ usuario: sanitizeUsuario(existing), mensaje: 'Usuario ya registrado' });
    }

    const passwordHash = await bcrypt.hash(String(password || ''), 10);

    const { rows } = await pgQuery(
      `INSERT INTO usuarios (nombre, email, username, telefono, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        String(nombre || ''),
        emailNorm,
        usernameNorm,
        String(telefono || ''),
        passwordHash,
        rol,
      ]
    );

    const usuario = rows[0];

    const token = jwt.sign(
      { id: String(usuario.id), rol: usuario.rol },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, usuario: sanitizeUsuario(usuario) });
  } catch (error) {
    console.error(error);
    // unique_violation
    if (error?.code === '23505') {
      return res.status(409).json({ mensaje: 'El usuario ya existe' });
    }
    return res.status(500).json({ mensaje: 'Error al crear el usuario' });
  }
};

export const actualizarUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    const { rows: existingRows } = await pgQuery('SELECT * FROM usuarios WHERE id = $1 LIMIT 1', [id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ message: 'Usuario no encontrado' });

    const defaultEmail = getDefaultSuperAdminEmail();
    const isDefault =
      Boolean(defaultEmail) &&
      (String(existing.email).toLowerCase().trim() === defaultEmail ||
        String(existing.username).toLowerCase().trim() === defaultEmail);

    if (isDefault) {
      if (req.body?.rol && req.body.rol !== 'superadmin') {
        return res.status(400).json({ mensaje: 'No se puede cambiar el rol del superadmin principal' });
      }
      if (req.body?.email && String(req.body.email).toLowerCase().trim() !== String(existing.email)) {
        return res.status(400).json({ mensaje: 'No se puede cambiar el email del superadmin principal' });
      }
      if (req.body?.nombre && String(req.body.nombre).trim() !== String(existing.nombre || '').trim()) {
        return res.status(400).json({ mensaje: 'No se puede cambiar el nombre del superadmin principal' });
      }
      if (typeof req.body?.suspendido === 'boolean' && req.body.suspendido !== Boolean(existing.suspendido)) {
        return res.status(400).json({ mensaje: 'No se puede suspender el superadmin principal' });
      }
      if (typeof req.body?.oculto === 'boolean' && req.body.oculto !== Boolean(existing.oculto)) {
        return res.status(400).json({ mensaje: 'No se puede ocultar el superadmin principal' });
      }
    }

    const emailNorm = req.body?.email != null ? String(req.body.email).toLowerCase().trim() : null;
    const usernameNorm = req.body?.username != null ? String(req.body.username).toLowerCase().trim() : null;

    const passwordHash = req.body?.password ? await bcrypt.hash(String(req.body.password), 10) : null;

    const { rows } = await pgQuery(
      `UPDATE usuarios
       SET nombre = COALESCE($2, nombre),
           email = COALESCE($3, email),
           username = COALESCE($4, username),
           telefono = COALESCE($5, telefono),
           rol = COALESCE($6, rol),
           suspendido = COALESCE($7, suspendido),
           oculto = COALESCE($8, oculto),
           password_hash = COALESCE($9, password_hash),
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        req.body?.nombre != null ? String(req.body.nombre) : null,
        emailNorm,
        usernameNorm,
        req.body?.telefono != null ? String(req.body.telefono) : null,
        req.body?.rol != null ? String(req.body.rol) : null,
        typeof req.body?.suspendido === 'boolean' ? req.body.suspendido : null,
        typeof req.body?.oculto === 'boolean' ? req.body.oculto : null,
        passwordHash,
      ]
    );

    return res.json(sanitizeUsuario(rows[0]));
  } catch (error) {
    console.error(error);
    if (error?.code === '23505') {
      return res.status(409).json({ mensaje: 'El usuario ya existe' });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const eliminarUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    const { rows: existingRows } = await pgQuery('SELECT * FROM usuarios WHERE id = $1 LIMIT 1', [id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ message: 'Usuario no encontrado' });

    const defaultEmail = getDefaultSuperAdminEmail();
    const isDefault =
      Boolean(defaultEmail) &&
      (String(existing.email).toLowerCase().trim() === defaultEmail ||
        String(existing.username).toLowerCase().trim() === defaultEmail);

    if (isDefault) {
      return res.status(400).json({ mensaje: 'No se puede eliminar el superadmin principal' });
    }

    await pgQuery('DELETE FROM usuarios WHERE id = $1', [id]);
    return res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailNorm = String(email || '').toLowerCase().trim();

    const usuario = await getUsuarioByEmailOrUsername(emailNorm);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (Boolean(usuario?.suspendido)) {
      return res.status(403).json({ error: 'Usuario suspendido' });
    }

    const esValido = await bcrypt.compare(String(password || ''), String(usuario.password_hash || ''));
    if (!esValido) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { id: String(usuario.id), rol: usuario.rol },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '7d' }
    );

    return res.json({ token, usuario: sanitizeUsuario(usuario) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

export const recuperarPassword = async (req, res) => {
  try {
    const username = req.body?.username;
    const emailNorm = String(username || '').toLowerCase().trim();
    if (!emailNorm) return res.status(400).json({ mensaje: 'Email inválido' });

    const usuario = await getUsuarioByEmailOrUsername(emailNorm);

    // Respuesta neutra
    if (!usuario) return res.json({ ok: true });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await pgQuery(
      `UPDATE usuarios
       SET password_reset_token_hash = $2,
           password_reset_expires = $3,
           updated_at = now()
       WHERE id = $1`,
      [usuario.id, tokenHash, expires]
    );

    await sendPasswordRecoveryEmail(usuario.email, token);

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: 'Error al solicitar recuperación' });
  }
};

export const resetearPassword = async (req, res) => {
  try {
    const username = req.body?.username;
    const token = req.body?.token;
    const password = req.body?.password;

    const emailNorm = String(username || '').toLowerCase().trim();
    if (!token || typeof token !== 'string') return res.status(400).json({ mensaje: 'Token inválido' });
    if (!password || typeof password !== 'string') return res.status(400).json({ mensaje: 'Password inválido' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const params = [tokenHash];
    let where = 'password_reset_token_hash = $1 AND password_reset_expires > now()';

    if (emailNorm) {
      params.push(emailNorm);
      where = `(${where}) AND (email = $2 OR username = $2)`;
    }

    const { rows } = await pgQuery(`SELECT id FROM usuarios WHERE ${where} LIMIT 1`, params);
    const row = rows[0];
    if (!row) return res.status(400).json({ mensaje: 'Token inválido o expirado' });

    const passwordHash = await bcrypt.hash(String(password), 10);

    await pgQuery(
      `UPDATE usuarios
       SET password_hash = $2,
           password_reset_token_hash = NULL,
           password_reset_expires = NULL,
           updated_at = now()
       WHERE id = $1`,
      [row.id, passwordHash]
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: 'Error al restablecer contraseña' });
  }
};
