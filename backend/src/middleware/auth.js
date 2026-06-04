import jwt from 'jsonwebtoken';
import UsuariosModel from '../models/usuariosSchema.js';
import { isPostgres } from '../config/dbProvider.js';
import { pgQuery } from '../database/postgres.js';

// Extrae el token Bearer desde el header de autorización.
function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [type, token] = header.split(' ');
  if (String(type).toLowerCase() !== 'bearer') return null;
  return token || null;
}

// Verifica el JWT y carga el usuario desde Mongo o Postgres según el proveedor activo.
async function loadUserFromToken(token) {
  const secret = process.env.JWT_SECRET || 'secreto';
  const payload = jwt.verify(token, secret);
  const id = payload?.id;
  if (!id) return null;

  // Si la app está usando Postgres, consulta la tabla `usuarios`.
  if (isPostgres()) {
    const userId = Number(id);
    if (!Number.isInteger(userId)) return null;
    const { rows } = await pgQuery(
      `SELECT id, rol, nombre, email, telefono, suspendido
       FROM usuarios
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    const row = rows?.[0];
    if (!row) return null;
    return {
      _id: String(row.id),
      rol: row.rol,
      nombre: row.nombre,
      email: row.email,
      telefono: row.telefono,
      suspendido: Boolean(row.suspendido),
    };
  }

  const user = await UsuariosModel.findById(id).select('_id rol nombre email telefono suspendido');
  return user || null;
}

// Middleware opcional: si hay token válido, adjunta `req.user`; si no, sigue sin bloquear.
export async function optionalAuth(req, _res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return next();
    const user = await loadUserFromToken(token);
    if (user) req.user = user;
    return next();
  } catch {
    return next();
  }
}

// Middleware obligatorio: exige token válido y rechaza usuarios suspendidos.
export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ mensaje: 'No autenticado' });
    const user = await loadUserFromToken(token);
    if (!user) return res.status(401).json({ mensaje: 'No autenticado' });
    if (Boolean(user?.suspendido)) return res.status(403).json({ mensaje: 'Usuario suspendido' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
}

// Permite el acceso solo a administradores y superadministradores.
export function requireAdmin(req, res, next) {
  const rol = req.user?.rol;
  if (rol === 'admin' || rol === 'superadmin') return next();
  return res.status(403).json({ mensaje: 'No autorizado' });
}

// Restringe el acceso únicamente al superadmin.
export function requireSuperAdmin(req, res, next) {
  const rol = req.user?.rol;
  if (rol === 'superadmin') return next();
  return res.status(403).json({ mensaje: 'Solo superadmin' });
}

// Permite que el usuario acceda a su propio recurso o que lo haga un admin.
export function allowSelfOrAdmin(paramName = 'id') {
  return (req, res, next) => {
    const rol = req.user?.rol;
    if (rol === 'admin' || rol === 'superadmin') return next();
    const requestedId = String(req.params?.[paramName] || '');
    const ownId = String(req.user?._id || '');
    if (requestedId && ownId && requestedId === ownId) return next();
    return res.status(403).json({ mensaje: 'No autorizado' });
  };
}
