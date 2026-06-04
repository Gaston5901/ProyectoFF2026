import 'dotenv/config';

// URI de MongoDB tomada del entorno; si no existe, usa la base local por defecto.
export const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Reservasturnosdb';
 