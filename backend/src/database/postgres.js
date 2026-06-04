import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

let pool;

// Crea y reutiliza una única conexión agrupada a PostgreSQL.
function getPool() {
  if (pool) return pool;

  // Si existe DATABASE_URL, usa la URL completa; si no, arma la conexión manualmente.
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

// Ejecuta queries SQL usando el pool compartido.
export async function pgQuery(text, params) {
  const p = getPool();
  return p.query(text, params);
}

// Inicializa PostgreSQL, aplica pequeñas migraciones y asegura el superadmin.
export async function initPostgres() {
  const db = process.env.PGDATABASE || '(sin PGDATABASE)';
  try {
    // Hace una consulta mínima para comprobar que la conexión responde.
    await pgQuery('select 1 as ok');
    console.log(`[postgres] conectado OK (${db})`);

    // Migración liviana: la app usa `turnos.pago_id` como ID de pago legible.
    // Algunas instalaciones pueden no tener aún esa columna (schema antiguo).
    try {
      const { rows: colRows } = await pgQuery(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'turnos'
           AND column_name = 'pago_id'
         LIMIT 1`
      );
      if (!colRows?.[0]) {
        await pgQuery(`ALTER TABLE turnos ADD COLUMN pago_id TEXT NOT NULL DEFAULT ''`);
        console.log('[postgres] migración aplicada: turnos.pago_id');
      }
    } catch (e) {
      console.warn('[postgres] no se pudo asegurar turnos.pago_id:', e?.message || e);
    }

    // Migración liviana: soft delete de servicios (archivar) via `servicios.activo`
    try {
      const { rows: colRows } = await pgQuery(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'servicios'
           AND column_name = 'activo'
         LIMIT 1`
      );
      if (!colRows?.[0]) {
        await pgQuery(`ALTER TABLE servicios ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE`);
        console.log('[postgres] migración aplicada: servicios.activo');
      }
    } catch (e) {
      console.warn('[postgres] no se pudo asegurar servicios.activo:', e?.message || e);
    }

    // Seed / asegurar superadmin por defecto (similar a ensureDefaultAdmin en Mongo)
    // Garantiza que exista una cuenta administradora principal en PostgreSQL.
    const superAdminEmail = (
      process.env.DEFAULT_SUPERADMIN_EMAIL ||
      process.env.DEFAULT_ADMIN_EMAIL ||
      'superadmin@gmail.com'
    )
      .toLowerCase()
      .trim();
    const superAdminPassword =
      process.env.DEFAULT_SUPERADMIN_PASSWORD ||
      process.env.DEFAULT_ADMIN_PASSWORD ||
      'superadmin123';
    const superAdminNombre = String(process.env.DEFAULT_SUPERADMIN_NOMBRE || 'Triny').trim();
    const legacyEmails = ['admin@turnos.com'].filter((email) => email !== superAdminEmail);

    if (superAdminEmail) {
      const emailsToMatch = [superAdminEmail, ...legacyEmails];
      const { rows } = await pgQuery(
        `SELECT id, rol, nombre, email, username, password_hash
         FROM usuarios
         WHERE lower(email) = ANY($1::text[]) OR lower(username) = ANY($1::text[])
         LIMIT 1`,
        [emailsToMatch]
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
        const passwordMatches = admin.password_hash
          ? await bcrypt.compare(String(superAdminPassword), String(admin.password_hash || ''))
          : false;
        const needsUpdate =
          admin.rol !== 'superadmin' ||
          String(admin.nombre || '').trim() !== superAdminNombre ||
          String(admin.email || '').toLowerCase().trim() !== superAdminEmail ||
          String(admin.username || '').toLowerCase().trim() !== superAdminEmail ||
          !passwordMatches;
        if (needsUpdate) {
          const passwordHash = passwordMatches
            ? admin.password_hash
            : await bcrypt.hash(String(superAdminPassword), 10);
          await pgQuery(
            `UPDATE usuarios
             SET rol = 'superadmin',
                 nombre = $2,
                 email = $3,
                 username = $3,
                 password_hash = $4,
                 updated_at = now()
             WHERE id = $1`,
            [admin.id, superAdminNombre, superAdminEmail, passwordHash]
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

// Cierra el pool cuando la app se apaga o necesita liberar recursos.
export async function closePostgresPool() {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}
