// Devuelve el proveedor de base de datos configurado en el entorno.
export function getDbProvider() {
  return String(process.env.DB_PROVIDER || 'mongo').toLowerCase().trim();
}

// Indica si la app está configurada para usar PostgreSQL.
export function isPostgres() {
  const provider = getDbProvider();
  return provider === 'postgres' || provider === 'pg' || provider === 'postgresql';
}
