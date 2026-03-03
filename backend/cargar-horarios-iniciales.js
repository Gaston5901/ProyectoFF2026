// Script para cargar los horariosPorDia y configuracion inicial en MongoDB Atlas
import mongoose from 'mongoose';
import ConfiguracionModel from './src/models/configuracionSchema.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('./.env') });

const dbPath = path.resolve('./db.json');
const raw = fs.readFileSync(dbPath, 'utf-8');
const data = JSON.parse(raw);

async function cargarConfiguracion() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  // Cargar horariosPorDia y configuracion
  const horariosPorDia = data.horariosPorDia || {};
  const config = data.configuracion || {};

  await ConfiguracionModel.deleteMany({});
  await ConfiguracionModel.create({
    ...config,
    horariosPorDia
  });
  console.log('Configuración y horariosPorDia migrados');

  await mongoose.disconnect();
  console.log('¡Listo!');
}

cargarConfiguracion().catch(e => { console.error(e); process.exit(1); });
