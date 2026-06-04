import { isPostgres } from '../config/dbProvider.js';
import { initMongo } from './mongo.js';
import { initPostgres } from './postgres.js';

// Inicializa la base de datos elegida por configuración.
export async function initDb() {
  // Si el proveedor activo es PostgreSQL, inicializa ese motor.
  if (isPostgres()) {
    await initPostgres();
    return;
  }
  // En caso contrario, usa MongoDB como fallback.
  await initMongo();
}
