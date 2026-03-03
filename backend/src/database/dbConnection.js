import { connect } from 'mongoose';
import { ensureDefaultAdmin } from '../helpers/ensureDefaultAdmin.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error(
    'Falta configurar la conexión a MongoDB. Definí MONGO_URI (o MONGODB_URI) en las variables de entorno.'
  );
  // En producción conviene fallar rápido para no “simular” que guarda datos.
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

connect(MONGO_URI)
  .then(async (resp) => {
    console.log(`DB conectada en ${resp.connection.name}`);
    await ensureDefaultAdmin();
  })
  .catch((error) => {
    console.error('Error conectando a MongoDB:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });