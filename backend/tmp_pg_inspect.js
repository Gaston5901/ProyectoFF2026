require("dotenv").config();
const { Pool } = require("pg");

// Construye la configuración de conexión usando DATABASE_URL si existe,
// o los datos sueltos de PostgreSQL en entorno local.
const cfg = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD,
    };

  // Pool reutilizable para consultar la base de datos.
const pool = new Pool(cfg);

(async () => {
    // Muestra qué base está apuntando el script.
  console.log("DB", process.env.PGDATABASE);

    // Consulta los valores posibles del enum transfer_status.
  const r1 = await pool.query(
    "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='transfer_status' ORDER BY enumsortorder"
  );
  console.log("transfer_status values:", r1.rows.map((x) => x.enumlabel));

    // Revisa cómo está definida la columna estado_transferencia en la tabla turnos.
  const r2 = await pool.query(
    "SELECT column_name,is_nullable,data_type,udt_name FROM information_schema.columns WHERE table_name='turnos' AND column_name='estado_transferencia'"
  );
  console.log("turnos.estado_transferencia:", r2.rows[0]);

    // Cierra el pool al terminar.
  await pool.end();
})().catch((e) => {
    // Si algo falla, imprime el error y termina con código distinto de 0.
  console.error(e);
  process.exit(1);
});
