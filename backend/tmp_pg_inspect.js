require("dotenv").config();
const { Pool } = require("pg");

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

const pool = new Pool(cfg);

(async () => {
  console.log("DB", process.env.PGDATABASE);
  const r1 = await pool.query(
    "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='transfer_status' ORDER BY enumsortorder"
  );
  console.log("transfer_status values:", r1.rows.map((x) => x.enumlabel));
  const r2 = await pool.query(
    "SELECT column_name,is_nullable,data_type,udt_name FROM information_schema.columns WHERE table_name='turnos' AND column_name='estado_transferencia'"
  );
  console.log("turnos.estado_transferencia:", r2.rows[0]);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
