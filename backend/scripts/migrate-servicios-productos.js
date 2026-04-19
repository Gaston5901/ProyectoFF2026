import 'dotenv/config';
import mongoose from 'mongoose';
import ServiciosModel from '../src/models/serviciosSchema.js';
import ProductosModel from '../src/models/productosSchema.js';
import { pgQuery, closePostgresPool } from '../src/database/postgres.js';

function getMongoUri() {
  return process.env.MONGO_URI || process.env.MONGODB_URI;
}

function asDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function upsertServicio(doc, { dryRun }) {
  const nombre = String(doc.nombre || '').trim();
  if (!nombre) return { skipped: true, reason: 'nombre vacío' };

  const descripcion = doc.descripcion != null ? String(doc.descripcion) : null;
  const precio = doc.precio != null ? Number(doc.precio) : null;
  const duracionMin = doc.duracion != null ? Number(doc.duracion) : null;
  const imagenUrl = doc.imagen != null ? String(doc.imagen) : '';

  const createdAt = asDate(doc.createdAt) || new Date();
  const updatedAt = asDate(doc.updatedAt) || createdAt;

  const { rows: found } = await pgQuery(
    'SELECT id FROM servicios WHERE lower(nombre) = lower($1) LIMIT 1',
    [nombre]
  );

  if (dryRun) {
    return { dryRun: true, action: found[0] ? 'update' : 'insert', nombre };
  }

  if (found[0]) {
    const id = found[0].id;
    await pgQuery(
      `UPDATE servicios
       SET descripcion = $2,
           precio = $3,
           duracion_min = $4,
           imagen_url = $5,
           created_at = $6,
           updated_at = $7,
           nombre = $8
       WHERE id = $1`,
      [id, descripcion, precio, duracionMin, imagenUrl, createdAt, updatedAt, nombre]
    );
    return { action: 'update', id: String(id), nombre };
  }

  const ins = await pgQuery(
    `INSERT INTO servicios (nombre, descripcion, precio, duracion_min, imagen_url, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [nombre, descripcion, precio, duracionMin, imagenUrl, createdAt, updatedAt]
  );
  return { action: 'insert', id: String(ins.rows?.[0]?.id), nombre };
}

async function upsertProducto(doc, { dryRun }) {
  const nombre = String(doc.nombre || '').trim();
  if (!nombre) return { skipped: true, reason: 'nombre vacío' };

  const precio = doc.precio != null ? Number(doc.precio) : null;
  const descripcion = doc.descripcion != null ? String(doc.descripcion) : '';
  const imagenUrl = doc.imagen != null ? String(doc.imagen) : '';

  // En Mongo este schema no tiene timestamps
  const now = new Date();

  const { rows: found } = await pgQuery(
    'SELECT id FROM productos WHERE lower(nombre) = lower($1) LIMIT 1',
    [nombre]
  );

  if (dryRun) {
    return { dryRun: true, action: found[0] ? 'update' : 'insert', nombre };
  }

  if (found[0]) {
    const id = found[0].id;
    await pgQuery(
      `UPDATE productos
       SET precio = $2,
           descripcion = $3,
           imagen_url = $4,
           nombre = $5,
           updated_at = $6
       WHERE id = $1`,
      [id, precio, descripcion, imagenUrl, nombre, now]
    );
    return { action: 'update', id: String(id), nombre };
  }

  const ins = await pgQuery(
    `INSERT INTO productos (nombre, precio, descripcion, imagen_url, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [nombre, precio, descripcion, imagenUrl, now, now]
  );
  return { action: 'insert', id: String(ins.rows?.[0]?.id), nombre };
}

async function migrateServicios({ dryRun }) {
  const docs = await ServiciosModel.find({}).lean();
  console.log(`[migrate][servicios] encontrados en Mongo: ${docs.length}`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const r = await upsertServicio(doc, { dryRun });
    if (r.skipped) {
      skipped += 1;
      continue;
    }
    if (r.action === 'insert') inserted += 1;
    if (r.action === 'update') updated += 1;
  }

  console.log(
    `[migrate][servicios] ${dryRun ? 'dry-run ' : ''}inserted=${inserted} updated=${updated} skipped=${skipped}`
  );
}

async function migrateProductos({ dryRun }) {
  const docs = await ProductosModel.find({}).lean();
  console.log(`[migrate][productos] encontrados en Mongo: ${docs.length}`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const r = await upsertProducto(doc, { dryRun });
    if (r.skipped) {
      skipped += 1;
      continue;
    }
    if (r.action === 'insert') inserted += 1;
    if (r.action === 'update') updated += 1;
  }

  console.log(
    `[migrate][productos] ${dryRun ? 'dry-run ' : ''}inserted=${inserted} updated=${updated} skipped=${skipped}`
  );
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

  await migrateServicios({ dryRun });
  await migrateProductos({ dryRun });

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
