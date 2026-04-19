import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import TurnosModel from '../src/models/turnosSchema.js';
import UsuariosModel from '../src/models/usuariosSchema.js';
import ServiciosModel from '../src/models/serviciosSchema.js';

import { pgQuery, closePostgresPool } from '../src/database/postgres.js';

function getMongoUri() {
  return process.env.MONGO_URI || process.env.MONGODB_URI;
}

function normalizeEmail(value) {
  return String(value || '').toLowerCase().trim();
}

function normalizeHora(value) {
  let hora = String(value || '').trim();
  if (/^\d{1,2}:\d{1,2}$/.test(hora)) {
    const [hh, mm] = hora.split(':');
    hora = hh.padStart(2, '0') + ':' + mm.padStart(2, '0');
  }
  // recortar por si viene HH:MM:SS
  if (/^\d{2}:\d{2}:\d{2}$/.test(hora)) hora = hora.slice(0, 5);
  return hora;
}

function asDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateToYmd(date) {
  const d = asDate(date);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function extractHoraFromFecha(date) {
  const d = asDate(date);
  if (!d) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const ESTADOS_VALIDOS = new Set([
  'pendiente',
  'en_proceso',
  'confirmado',
  'cancelado',
  'devuelto',
  'realizado',
  'completado',
  'rechazado',
]);

function normalizeEstado(value) {
  const e = String(value || '').toLowerCase().trim();
  return ESTADOS_VALIDOS.has(e) ? e : 'pendiente';
}

const TRANSFER_STATUS_VALIDOS = new Set(['pendiente', 'aprobado', 'rechazado']);

function normalizeTransferStatus(value) {
  const v = String(value || '').toLowerCase().trim();
  if (!v) return null;
  return TRANSFER_STATUS_VALIDOS.has(v) ? v : null;
}

async function findServicioIdByNombre(nombre) {
  const { rows } = await pgQuery('SELECT id FROM servicios WHERE lower(nombre) = lower($1) LIMIT 1', [nombre]);
  return rows[0]?.id || null;
}

async function findUsuarioIdByEmail(emailNorm) {
  const { rows } = await pgQuery(
    'SELECT id FROM usuarios WHERE lower(email) = lower($1) OR lower(username) = lower($1) LIMIT 1',
    [emailNorm]
  );
  return rows[0]?.id || null;
}

async function ensureUsuarioByEmail({ emailNorm, nombre, telefono }) {
  const existingId = await findUsuarioIdByEmail(emailNorm);
  if (existingId) return existingId;

  const passwordHash = await bcrypt.hash('migrado_' + Math.random().toString(16).slice(2), 10);
  const { rows } = await pgQuery(
    `INSERT INTO usuarios (nombre, email, username, telefono, password_hash, rol)
     VALUES ($1, $2, $2, $3, $4, 'cliente')
     RETURNING id`,
    [String(nombre || ''), emailNorm, String(telefono || ''), passwordHash]
  );
  return rows[0]?.id;
}

async function findTurnoByMongoId(mongoId) {
  const { rows } = await pgQuery('SELECT id, mongo_id FROM turnos WHERE mongo_id = $1 LIMIT 1', [mongoId]);
  return rows[0] || null;
}

async function findTurnoBySlot(servicioId, fechaYmd, hora) {
  const { rows } = await pgQuery(
    'SELECT id, mongo_id, estado FROM turnos WHERE servicio_id = $1 AND fecha = $2 AND hora = $3 LIMIT 1',
    [servicioId, fechaYmd, hora]
  );
  return rows[0] || null;
}

async function upsertTurno(doc, { dryRun }) {
  const mongoId = String(doc._id);

  // Resolver usuario/email
  let emailNorm = normalizeEmail(doc.email);
  let nombre = String(doc.nombre || '').trim();
  let telefono = String(doc.telefono || '').trim();

  if (!emailNorm && doc.usuario) {
    const u = await UsuariosModel.findById(doc.usuario).lean();
    emailNorm = normalizeEmail(u?.email || u?.username);
    nombre = nombre || String(u?.nombre || '').trim();
    telefono = telefono || String(u?.telefono || '').trim();
  }

  if (!emailNorm) {
    return { skipped: true, reason: 'sin email para mapear usuario', mongoId };
  }

  // Resolver servicio
  let servicioNombre = '';
  if (doc.servicio) {
    const s = await ServiciosModel.findById(doc.servicio).lean();
    servicioNombre = String(s?.nombre || '').trim();
  }

  if (!servicioNombre) {
    return { skipped: true, reason: 'sin servicio para mapear', mongoId };
  }

  const servicioId = await findServicioIdByNombre(servicioNombre);
  if (!servicioId) {
    return { skipped: true, reason: `servicio no existe en PG: ${servicioNombre}`, mongoId };
  }

  const usuarioId = await ensureUsuarioByEmail({ emailNorm, nombre, telefono });
  if (!usuarioId) {
    return { skipped: true, reason: 'no se pudo asegurar usuario en PG', mongoId };
  }

  const fechaYmd = dateToYmd(doc.fecha);
  if (!fechaYmd) {
    return { skipped: true, reason: 'fecha inválida', mongoId };
  }

  // Hora: usar doc.hora si existe, sino derivar de doc.fecha
  const hora = normalizeHora(doc.hora || '') || normalizeHora(extractHoraFromFecha(doc.fecha));
  if (!hora) {
    return { skipped: true, reason: 'hora vacía/ inválida', mongoId };
  }

  const estado = normalizeEstado(doc.estado);

  const payload = {
    mongoId,
    usuarioId,
    servicioId,
    fechaYmd,
    hora,
    estado,
    email: emailNorm,
    nombre,
    telefono,
    comentario: String(doc.comentario || ''),
    registroEstadistica: String(doc.registroEstadistica || ''),
    montoPagado: Number(doc.montoPagado || 0),
    montoTotal: Number(doc.montoTotal || 0),
    emailEnviado: Boolean(doc.emailEnviado),
    seniaDevuelta: Boolean(doc.seniaDevuelta),
    comprobantePath: String(doc.comprobanteTransferencia || ''),
    estadoTransferencia: normalizeTransferStatus(doc.estadoTransferencia),
    motivoRechazoTransferencia: String(doc.motivoRechazoTransferencia || ''),
    titularTransferencia: String(doc.titularTransferencia || ''),
    metodoTransferencia: String(doc.metodoTransferencia || ''),
    createdAt: asDate(doc.createdAt) || new Date(),
    updatedAt: asDate(doc.updatedAt) || asDate(doc.createdAt) || new Date(),
  };

  const existingByMongo = await findTurnoByMongoId(mongoId);
  if (existingByMongo) {
    if (dryRun) return { dryRun: true, action: 'update', id: String(existingByMongo.id), mongoId };

    await pgQuery(
      `UPDATE turnos
       SET usuario_id = $2,
           servicio_id = $3,
           fecha = $4,
           hora = $5,
           estado = $6,
           email = $7,
           nombre = $8,
           telefono = $9,
           comentario = $10,
           registro_estadistica = $11,
           monto_pagado = $12,
           monto_total = $13,
           email_enviado = $14,
           senia_devuelta = $15,
           comprobante_path = $16,
           estado_transferencia = $17,
           motivo_rechazo_transferencia = $18,
           titular_transferencia = $19,
           metodo_transferencia = $20,
           created_at = $21,
           updated_at = $22
       WHERE id = $1`,
      [
        existingByMongo.id,
        payload.usuarioId,
        payload.servicioId,
        payload.fechaYmd,
        payload.hora,
        payload.estado,
        payload.email,
        payload.nombre,
        payload.telefono,
        payload.comentario,
        payload.registroEstadistica,
        payload.montoPagado,
        payload.montoTotal,
        payload.emailEnviado,
        payload.seniaDevuelta,
        payload.comprobantePath,
        payload.estadoTransferencia,
        payload.motivoRechazoTransferencia,
        payload.titularTransferencia,
        payload.metodoTransferencia,
        payload.createdAt,
        payload.updatedAt,
      ]
    );

    return { action: 'update', id: String(existingByMongo.id), mongoId };
  }

  // Si no tiene mongo_id aún, intentamos por slot para evitar duplicados si ya se creó en PG
  const existingBySlot = await findTurnoBySlot(payload.servicioId, payload.fechaYmd, payload.hora);
  if (existingBySlot && !existingBySlot.mongo_id) {
    if (dryRun) return { dryRun: true, action: 'update-slot', id: String(existingBySlot.id), mongoId };

    await pgQuery(
      `UPDATE turnos
       SET mongo_id = $2,
           usuario_id = $3,
           estado = $4,
           email = $5,
           nombre = $6,
           telefono = $7,
           comentario = $8,
           registro_estadistica = $9,
           monto_pagado = $10,
           monto_total = $11,
           email_enviado = $12,
           senia_devuelta = $13,
           comprobante_path = $14,
           estado_transferencia = $15,
           motivo_rechazo_transferencia = $16,
           titular_transferencia = $17,
           metodo_transferencia = $18,
           created_at = $19,
           updated_at = $20
       WHERE id = $1`,
      [
        existingBySlot.id,
        payload.mongoId,
        payload.usuarioId,
        payload.estado,
        payload.email,
        payload.nombre,
        payload.telefono,
        payload.comentario,
        payload.registroEstadistica,
        payload.montoPagado,
        payload.montoTotal,
        payload.emailEnviado,
        payload.seniaDevuelta,
        payload.comprobantePath,
        payload.estadoTransferencia,
        payload.motivoRechazoTransferencia,
        payload.titularTransferencia,
        payload.metodoTransferencia,
        payload.createdAt,
        payload.updatedAt,
      ]
    );

    return { action: 'update-slot', id: String(existingBySlot.id), mongoId };
  }

  if (existingBySlot && existingBySlot.mongo_id) {
    return { skipped: true, reason: 'slot ya existe en PG con mongo_id', mongoId };
  }

  if (dryRun) return { dryRun: true, action: 'insert', mongoId };

  try {
    const ins = await pgQuery(
      `INSERT INTO turnos (
         mongo_id,
         usuario_id,
         servicio_id,
         fecha,
         hora,
         estado,
         email,
         nombre,
         telefono,
         comentario,
         registro_estadistica,
         monto_pagado,
         monto_total,
         email_enviado,
         senia_devuelta,
         comprobante_path,
         estado_transferencia,
         motivo_rechazo_transferencia,
         titular_transferencia,
         metodo_transferencia,
         created_at,
         updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
       )
       RETURNING id`,
      [
        payload.mongoId,
        payload.usuarioId,
        payload.servicioId,
        payload.fechaYmd,
        payload.hora,
        payload.estado,
        payload.email,
        payload.nombre,
        payload.telefono,
        payload.comentario,
        payload.registroEstadistica,
        payload.montoPagado,
        payload.montoTotal,
        payload.emailEnviado,
        payload.seniaDevuelta,
        payload.comprobantePath,
        payload.estadoTransferencia,
        payload.motivoRechazoTransferencia,
        payload.titularTransferencia,
        payload.metodoTransferencia,
        payload.createdAt,
        payload.updatedAt,
      ]
    );

    return { action: 'insert', id: String(ins.rows?.[0]?.id), mongoId };
  } catch (e) {
    if (e?.code === '23505') {
      return { skipped: true, reason: 'conflicto unique (23505) insert turnos', mongoId };
    }
    throw e;
  }
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

  // solo lean: poblar refs a mano para controlar lookup
  const docs = await TurnosModel.find({}).sort({ createdAt: 1 }).lean();
  console.log(`[migrate][turnos] encontrados en Mongo: ${docs.length}`);

  let inserted = 0;
  let updated = 0;
  let updatedSlot = 0;
  let skipped = 0;

  for (const doc of docs) {
    const r = await upsertTurno(doc, { dryRun });
    if (r.skipped) {
      skipped += 1;
      continue;
    }
    if (r.action === 'insert') inserted += 1;
    if (r.action === 'update') updated += 1;
    if (r.action === 'update-slot') updatedSlot += 1;
  }

  console.log(
    `[migrate][turnos] ${dryRun ? 'dry-run ' : ''}inserted=${inserted} updated=${updated} updatedSlot=${updatedSlot} skipped=${skipped}`
  );

  if (!dryRun) {
    const { rows } = await pgQuery('SELECT count(*)::int AS count FROM turnos');
    console.log('[migrate][turnos] total en Postgres:', Number(rows?.[0]?.count || 0));
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
