export function getDbProvider() {
  return String(process.env.DB_PROVIDER || 'mongo').toLowerCase().trim();
}

export function isPostgres() {
  const provider = getDbProvider();
  return provider === 'postgres' || provider === 'pg' || provider === 'postgresql';
}
