import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import "dotenv/config";
import './src/database/dbConnection.js';
import mongoose from 'mongoose';


import productosRoutes from './src/routes/productos.routes.js';
import usuariosRoutes from './src/routes/usuarios.routes.js';
import serviciosRoutes from './src/routes/servicios.routes.js';
import turnosRoutes from './src/routes/turnos.routes.js';
import configuracionRoutes from './src/routes/configuracion.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import carruselRoutes from './src/routes/carrusel.routes.js';
import pagoRoutes from './src/routes/pagoRoutes.js';
import webhookRoutes from './src/routes/webhook.routes.js';



const app = express();
app.use(cors());
// Permite payloads más grandes (p.ej. imágenes en base64 desde el panel admin)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// Health check para verificar deployment + conexión a DB
app.get('/api/health', (req, res) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose?.connection?.readyState;
  res.json({
    ok: true,
    now: new Date().toISOString(),
    mongo: {
      readyState,
      status: states[readyState] || 'unknown',
      name: mongoose?.connection?.name,
    },
  });
});


app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/carrusel', carruselRoutes);
// Compat: el frontend actual usa /api/pagos
app.use('/api/pagos', pagoRoutes);
// Compat: ruta vieja (singular)
app.use('/api/pago', pagoRoutes);
app.use('/api', webhookRoutes);

app.set('port', process.env.PORT || 4000);
app.listen(app.get('port'), () => {
  console.log(`app running on port ${app.get('port')}`);
});
