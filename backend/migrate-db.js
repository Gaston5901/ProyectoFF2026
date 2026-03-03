// Script de migración de db.json a MongoDB Atlas
// Ejecuta: node migrate-db.js (con el backend apagado)

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('./.env') });

// Modelos
import UsuariosModel from './src/models/usuariosSchema.js';
import ServiciosModel from './src/models/serviciosSchema.js';
import TurnosModel from './src/models/turnosSchema.js';
import CarruselModel from './src/models/carruselSchema.js';

const dbPath = path.resolve('../db.json');
const raw = fs.readFileSync(dbPath, 'utf-8');
const data = JSON.parse(raw);

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  // 1. Usuarios
  await UsuariosModel.deleteMany({});
  for (const u of data.usuarios) {
    const hashed = await bcrypt.hash(u.password, 10);
    await UsuariosModel.create({
      username: u.email,
      password: hashed,
      nombre: u.nombre || '',
      email: u.email || '',
      telefono: u.telefono || '',
      rol: u.rol || 'cliente',
    });
  }
  console.log('Usuarios migrados');

  // 2. Servicios
  await ServiciosModel.deleteMany({});
  for (const s of data.servicios) {
    await ServiciosModel.create({
      nombre: s.nombre,
      descripcion: s.descripcion,
      precio: s.precio,
      duracion: s.duracion,
      imagen: s.imagen || '',
    });
  }
  console.log('Servicios migrados');

  // 3. Carrusel
  await CarruselModel.deleteMany({});
  if (data.carrusel && Array.isArray(data.carrusel.imagenes)) {
    await CarruselModel.create({ imagenes: data.carrusel.imagenes });
  }
  console.log('Carrusel migrado');

  // 4. Turnos (requiere mapear usuarioId y servicioId a _id reales)
  await TurnosModel.deleteMany({});
  const usuarios = await UsuariosModel.find();
  const servicios = await ServiciosModel.find();
  const emailToId = Object.fromEntries(usuarios.map(u => [u.username, u._id]));
  const nombreToId = Object.fromEntries(servicios.map(s => [s.nombre, s._id]));

  for (const t of data.turnos) {
    // Buscar usuario y servicio
    const usuario = usuarios.find(u => u.username === t.email);
    const servicio = servicios.find(s => s.nombre === (data.servicios.find(sv => sv.id === t.servicioId)?.nombre));
    if (!usuario || !servicio) continue;
    // Unir fecha y hora
    let fecha = t.fecha;
    if (t.hora) fecha += 'T' + t.hora;
    await TurnosModel.create({
      usuario: usuario._id,
      servicio: servicio._id,
      fecha: new Date(fecha),
      estado: t.estado === 'completado' ? 'realizado' : (t.estado || 'pendiente'),
      comentario: t.registroEstadistica || '',
    });
  }
  console.log('Turnos migrados');

  await mongoose.disconnect();
  console.log('¡Migración completa!');
}

migrate().catch(e => { console.error(e); process.exit(1); });
