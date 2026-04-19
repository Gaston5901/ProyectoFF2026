import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

let pool;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  pool = new Pool(
    connectionString
      ? {
          connectionString,
          // Si tu URL es de un proveedor cloud con SSL, setear PGSSLMODE=require o usar ssl aquí.
          ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
        }
      : {
          host: process.env.PGHOST || 'localhost',
          port: Number(process.env.PGPORT || 5432),
          database: process.env.PGDATABASE,
          user: process.env.PGUSER || 'postgres',
          password: process.env.PGPASSWORD,
        }
  );

  return pool;
}

export async function pgQuery(text, params) {
  const p = getPool();
  return p.query(text, params);
}

export async function initPostgres() {
  const db = process.env.PGDATABASE || '(sin PGDATABASE)';
  try {
    await pgQuery('select 1 as ok');
    console.log(`[postgres] conectado OK (${db})`);

    // Seed / asegurar superadmin por defecto (similar a ensureDefaultAdmin en Mongo)
    const superAdminEmail = (
      process.env.DEFAULT_SUPERADMIN_EMAIL ||
      process.env.DEFAULT_ADMIN_EMAIL ||
      'admin@turnos.com'
    )
      .toLowerCase()
      .trim();
    const superAdminPassword =
      process.env.DEFAULT_SUPERADMIN_PASSWORD ||
      process.env.DEFAULT_ADMIN_PASSWORD ||
      'admin123';
    const superAdminNombre = String(process.env.DEFAULT_SUPERADMIN_NOMBRE || 'Triny').trim();

    if (superAdminEmail) {
      const { rows } = await pgQuery(
        `SELECT id, rol, nombre
         FROM usuarios
         WHERE email = $1 OR username = $1
         LIMIT 1`,
        [superAdminEmail]
      );

      if (!rows[0]) {
        const passwordHash = await bcrypt.hash(String(superAdminPassword), 10);
        await pgQuery(
          `INSERT INTO usuarios (nombre, email, username, telefono, password_hash, rol)
           VALUES ($1, $2, $2, '', $3, 'superadmin')`,
          [superAdminNombre, superAdminEmail, passwordHash]
        );
        console.log(`[Seed][postgres] Superadmin creado: ${superAdminEmail} (${superAdminNombre})`);
      } else {
        const admin = rows[0];
        const needsUpdate = admin.rol !== 'superadmin' || String(admin.nombre || '').trim() !== superAdminNombre;
        if (needsUpdate) {
          await pgQuery(
            `UPDATE usuarios
             SET rol = 'superadmin',
                 nombre = $2,
                 updated_at = now()
             WHERE id = $1`,
            [admin.id, superAdminNombre]
          );
          console.log(`[Seed][postgres] Superadmin asegurado para: ${superAdminEmail} (${superAdminNombre})`);
        }
      }
    }
  } catch (err) {
    const host = process.env.PGHOST || 'localhost';
    const port = process.env.PGPORT || '5432';
    const user = process.env.PGUSER || '(sin PGUSER)';
    const code = err?.code ? ` (code=${err.code})` : '';
    console.error(`[postgres] error conectando a ${user}@${host}:${port}/${db}${code}:`, err?.message || err);
    // Con DB_PROVIDER=postgres, si no conecta es mejor fallar rápido
    // para no levantar la API en un estado que parezca “OK” pero no persiste.
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

export async function closePostgresPool() {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}
