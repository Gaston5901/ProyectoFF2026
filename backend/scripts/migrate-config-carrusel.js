import 'dotenv/config';
import mongoose from 'mongoose';
import ConfiguracionModel from '../src/models/configuracionSchema.js';
import CarruselModel from '../src/models/carruselSchema.js';
import { pgQuery, closePostgresPool } from '../src/database/postgres.js';

function getMongoUri() {
  return process.env.MONGO_URI || process.env.MONGODB_URI;
}

function asDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  // invalid date -> null
  return Number.isNaN(d.getTime()) ? null : d;
}

async function migrateConfiguracion({ dryRun }) {
  const doc = await ConfiguracionModel.findOne().lean();
  if (!doc) {
    console.log('[migrate][configuracion] no hay documento en Mongo: skip');
    return { migrated: false };
  }

  const horaInicio = typeof doc.horaInicio === 'string' ? doc.horaInicio : null;
  const horaFin = typeof doc.horaFin === 'string' ? doc.horaFin : null;
  const diasLaborales = Array.isArray(doc.diasLaborales) ? doc.diasLaborales.map(Number).filter(Number.isFinite) : null;
  const porcentajeSenia = doc.porcentajeSeña != null ? Number(doc.porcentajeSeña) : null;
  const emailNotificaciones = typeof doc.emailNotificaciones === 'string' ? doc.emailNotificaciones : '';
  const horariosPorDia = doc.horariosPorDia && typeof doc.horariosPorDia === 'object' && !Array.isArray(doc.horariosPorDia)
    ? doc.horariosPorDia
    : {};

  const createdAt = asDate(doc.createdAt) || new Date();
  const updatedAt = asDate(doc.updatedAt) || createdAt;

  console.log('[migrate][configuracion] origen Mongo _id=', String(doc._id));

  if (dryRun) return { migrated: false, dryRun: true };

  await pgQuery(
    `INSERT INTO configuracion (
       id,
       hora_inicio,
       hora_fin,
       dias_laborales,
       porcentaje_senia,
       email_notificaciones,
       horarios_por_dia,
       created_at,
       updated_at
     )
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id)
     DO UPDATE SET
       hora_inicio = EXCLUDED.hora_inicio,
       hora_fin = EXCLUDED.hora_fin,
       dias_laborales = EXCLUDED.dias_laborales,
       porcentaje_senia = EXCLUDED.porcentaje_senia,
       email_notificaciones = EXCLUDED.email_notificaciones,
       horarios_por_dia = EXCLUDED.horarios_por_dia,
       created_at = EXCLUDED.created_at,
       updated_at = EXCLUDED.updated_at`,
    [
      horaInicio,
      horaFin,
      diasLaborales,
      Number.isFinite(porcentajeSenia) ? porcentajeSenia : null,
      emailNotificaciones,
      horariosPorDia,
      createdAt,
      updatedAt,
    ]
  );

  console.log('[migrate][configuracion] OK -> Postgres id=1');
  return { migrated: true };
}

async function migrateCarrusel({ dryRun }) {
  const doc = await CarruselModel.findOne().lean();
  if (!doc) {
    console.log('[migrate][carrusel] no hay documento en Mongo: skip');
    return { migrated: false };
  }

  const imagenes = Array.isArray(doc.imagenes) ? doc.imagenes.filter((x) => typeof x === 'string') : [];
  const createdAt = asDate(doc.createdAt) || new Date();
  const updatedAt = asDate(doc.updatedAt) || createdAt;

  console.log('[migrate][carrusel] origen Mongo _id=', String(doc._id), 'imagenes=', imagenes.length);

  if (dryRun) return { migrated: false, dryRun: true };

  await pgQuery(
    `INSERT INTO carrusel (id, imagenes, created_at, updated_at)
     VALUES (1, $1, $2, $3)
     ON CONFLICT (id)
     DO UPDATE SET
       imagenes = EXCLUDED.imagenes,
       created_at = EXCLUDED.created_at,
       updated_at = EXCLUDED.updated_at`,
    [imagenes, createdAt, updatedAt]
  );

  console.log('[migrate][carrusel] OK -> Postgres id=1');
  return { migrated: true };
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

  await migrateConfiguracion({ dryRun });
  await migrateCarrusel({ dryRun });

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
