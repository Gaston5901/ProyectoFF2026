import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import UsuariosModel from '../src/models/usuariosSchema.js';
import { pgQuery, closePostgresPool } from '../src/database/postgres.js';

function getMongoUri() {
  return process.env.MONGO_URI || process.env.MONGODB_URI;
}

function normalizeEmail(value) {
  return String(value || '').toLowerCase().trim();
}

function normalizeUsername(value, emailNorm) {
  const raw = value != null ? String(value) : '';
  const norm = raw.toLowerCase().trim();
  return norm || emailNorm;
}

function asDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isBcryptHash(value) {
  if (typeof value !== 'string') return false;
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

function normalizeRol(value) {
  const rol = String(value || '').toLowerCase().trim();
  const allowed = new Set(['cliente', 'usuario', 'admin', 'superadmin']);
  return allowed.has(rol) ? rol : 'cliente';
}

function getDefaultSuperAdminEmail() {
  return normalizeEmail(
    process.env.DEFAULT_SUPERADMIN_EMAIL ||
      process.env.DEFAULT_ADMIN_EMAIL ||
      'admin@turnos.com'
  );
}

async function findExistingUsuarioId(emailNorm, usernameNorm) {
  const { rows } = await pgQuery(
    `SELECT id, password_hash
     FROM usuarios
     WHERE lower(email) = lower($1)
        OR lower(username) = lower($1)
        OR lower(email) = lower($2)
        OR lower(username) = lower($2)
     LIMIT 1`,
    [emailNorm, usernameNorm]
  );
  return rows[0] || null;
}

async function upsertUsuario(doc, { dryRun, defaultEmail }) {
  const emailNorm = normalizeEmail(doc.email);
  if (!emailNorm) return { skipped: true, reason: 'email vacío' };

  if (emailNorm === defaultEmail) {
    return { skipped: true, reason: 'default superadmin (no tocar)', email: emailNorm };
  }

  const nombre = String(doc.nombre || '').trim();
  const telefono = doc.telefono != null ? String(doc.telefono) : '';
  const usernameNorm = normalizeUsername(doc.username, emailNorm);

  const rol = normalizeRol(doc.rol);
  const suspendido = Boolean(doc.suspendido);
  const oculto = Boolean(doc.oculto);

  const createdAt = asDate(doc.createdAt) || new Date();
  const updatedAt = asDate(doc.updatedAt) || createdAt;

  let passwordHash = null;
  if (typeof doc.password === 'string' && doc.password.trim()) {
    passwordHash = isBcryptHash(doc.password) ? doc.password : await bcrypt.hash(doc.password, 10);
  }

  const existing = await findExistingUsuarioId(emailNorm, usernameNorm);

  if (dryRun) {
    return {
      dryRun: true,
      action: existing ? 'update' : 'insert',
      email: emailNorm,
      rol,
    };
  }

  if (existing) {
    const shouldSetPassword = !existing.password_hash && passwordHash;

    await pgQuery(
      `UPDATE usuarios
       SET nombre = $2,
           email = $3,
           username = $4,
           telefono = $5,
           rol = $6,
           suspendido = $7,
           oculto = $8,
           password_hash = COALESCE($9, password_hash),
           updated_at = $10
       WHERE id = $1`,
      [
        existing.id,
        nombre,
        emailNorm,
        usernameNorm,
        telefono,
        rol,
        suspendido,
        oculto,
        shouldSetPassword ? passwordHash : null,
        updatedAt,
      ]
    );

    return { action: 'update', id: String(existing.id), email: emailNorm };
  }

  const ins = await pgQuery(
    `INSERT INTO usuarios (
       nombre,
       email,
       username,
       telefono,
       password_hash,
       rol,
       suspendido,
       oculto,
       created_at,
       updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      nombre,
      emailNorm,
      usernameNorm,
      telefono,
      passwordHash || '',
      rol,
      suspendido,
      oculto,
      createdAt,
      updatedAt,
    ]
  );

  return { action: 'insert', id: String(ins.rows?.[0]?.id), email: emailNorm };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    console.error('Falta MONGO_URI o MONGODB_URI en variables de entorno.');
    process.exit(1);
  }

  console.log('[migrate] conectando a Mongo...');
  await mongoose.connect(mongoUri);
  console.log('[migrate] Mongo OK:', mongoose.connection.name);

  console.log('[migrate] probando conexión a Postgres...');
  await pgQuery('SELECT 1');
  console.log('[migrate] Postgres OK:', process.env.PGDATABASE || '(sin PGDATABASE)');

  console.log(`[migrate] modo: ${dryRun ? 'DRY-RUN (no escribe en PG)' : 'WRITE'}`);

  const defaultEmail = getDefaultSuperAdminEmail();
  const docs = await UsuariosModel.find({}).lean();
  console.log(`[migrate][usuarios] encontrados en Mongo: ${docs.length}`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const r = await upsertUsuario(doc, { dryRun, defaultEmail });
    if (r.skipped) {
      skipped += 1;
      continue;
    }
    if (r.action === 'insert') inserted += 1;
    if (r.action === 'update') updated += 1;
  }

  console.log(`[migrate][usuarios] ${dryRun ? 'dry-run ' : ''}inserted=${inserted} updated=${updated} skipped=${skipped}`);

  if (!dryRun) {
    const { rows } = await pgQuery('SELECT count(*)::int AS count FROM usuarios');
    console.log('[migrate][usuarios] total en Postgres:', Number(rows?.[0]?.count || 0));
  }

  console.log('[migrate] listo');
}

main()
  .catch((err) => {
    console.error('[migrate] error:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
    try {
      await closePostgresPool();
    } catch {}
  });
