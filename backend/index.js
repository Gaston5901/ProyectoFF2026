import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import "dotenv/config";
import { initDb } from './src/database/initDb.js';
import mongoose from 'mongoose';
import { getDbProvider, isPostgres } from './src/config/dbProvider.js';
import { pgQuery } from './src/database/postgres.js';


import productosRoutes from './src/routes/productos.routes.js';
import usuariosRoutes from './src/routes/usuarios.routes.js';
import serviciosRoutes from './src/routes/servicios.routes.js';
import turnosRoutes from './src/routes/turnos.routes.js';
import configuracionRoutes from './src/routes/configuracion.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import carruselRoutes from './src/routes/carrusel.routes.js';
import pagoRoutes from './src/routes/pagoRoutes.js';
import webhookRoutes from './src/routes/webhook.routes.js';



// App principal del backend.
const app = express();
app.use(cors());
// Permite payloads más grandes, por ejemplo imágenes en base64 o formularios pesados.
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint de salud para verificar que el servidor levantó y cómo está la base de datos.
app.get('/api/health', async (req, res) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose?.connection?.readyState;
  const payload = {
    ok: true,
    provider: getDbProvider(),
    now: new Date().toISOString(),
    mongo: {
      readyState,
      status: states[readyState] || 'unknown',
      name: mongoose?.connection?.name,
    },
  };

  if (isPostgres()) {
    try {
      await pgQuery('SELECT 1');
      payload.postgres = { ok: true };
    } catch (e) {
      payload.postgres = { ok: false, error: e?.message };
    }
  }

  res.json(payload);
});


// Rutas principales de la API.
app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/carrusel', carruselRoutes);
// Compatibilidad con el frontend actual, que consume /api/pagos.
app.use('/api/pagos', pagoRoutes);
// Compatibilidad con la ruta vieja en singular.
app.use('/api/pago', pagoRoutes);
app.use('/api', webhookRoutes);

// Inicializa la base de datos y luego arranca el servidor HTTP.
async function start() {
  await initDb();

  app.set('port', process.env.PORT || 4000);
  app.listen(app.get('port'), () => {
    console.log(`app running on port ${app.get('port')}`);
  });
}

start();
