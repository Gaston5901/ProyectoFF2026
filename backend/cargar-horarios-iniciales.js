// Script para cargar la configuración inicial y los horariosPorDia en MongoDB.
import mongoose from 'mongoose';
import ConfiguracionModel from './src/models/configuracionSchema.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Lee el archivo .env para obtener la URI de MongoDB.
dotenv.config({ path: path.resolve('./.env') });

// Toma los datos base desde db.json.
const dbPath = path.resolve('./db.json');
const raw = fs.readFileSync(dbPath, 'utf-8');
const data = JSON.parse(raw);

async function cargarConfiguracion() {
  // Conecta a la base configurada en MONGODB_URI.
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  // Separa los bloques de horarios y configuración general.
  const horariosPorDia = data.horariosPorDia || {};
  const config = data.configuracion || {};

  // Borra la configuración anterior para dejar una sola versión limpia.
  await ConfiguracionModel.deleteMany({});
  // Crea la nueva configuración con horariosPorDia incluido.
  await ConfiguracionModel.create({
    ...config,
    horariosPorDia
  });
  console.log('Configuración y horariosPorDia migrados');

  // Cierra la conexión al terminar.
  await mongoose.disconnect();
  console.log('¡Listo!');
}

// Ejecuta la migración y corta con error si algo falla.
cargarConfiguracion().catch(e => { console.error(e); process.exit(1); });
