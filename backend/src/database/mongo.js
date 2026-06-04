import { connect } from 'mongoose';
import { ensureDefaultAdmin } from '../helpers/ensureDefaultAdmin.js';

// Conecta MongoDB y asegura que exista el admin por defecto.
export async function initMongo() {
  // Lee el URI desde las variables de entorno más comunes.
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!MONGO_URI) {
    // Si no hay URI, avisa y evita arrancar con una DB inexistente.
    console.error(
      'Falta configurar la conexión a MongoDB. Definí MONGO_URI (o MONGODB_URI) en las variables de entorno.'
    );
    // En producción conviene fallar rápido para no “simular” que guarda datos.
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return;
  }

  try {
    // Abre la conexión y luego crea el admin inicial si hace falta.
    const resp = await connect(MONGO_URI);
    console.log(`DB conectada en ${resp.connection.name}`);
    await ensureDefaultAdmin();
  } catch (error) {
    // En producción, cualquier error de conexión debe cortar el arranque.
    console.error('Error conectando a MongoDB:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}
