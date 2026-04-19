import { isPostgres } from '../config/dbProvider.js';
import { initMongo } from './mongo.js';
import { initPostgres } from './postgres.js';

export async function initDb() {
  if (isPostgres()) {
    await initPostgres();
    return;
  }
  await initMongo();
}
