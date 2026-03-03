// Endpoint para actualizar horariosPorDia (horarios extras y fechas especiales)
app.put('/horariosPorDia', (req, res) => {
  try {
    const db = readDB();
    db.horariosPorDia = req.body;
    writeDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando horarios' });
  }
});
// Endpoint para actualizar horariosPorDia (horarios extras y fechas especiales)
app.put('/horariosPorDia', (req, res) => {
  try {
    const db = readDB();
    db.horariosPorDia = req.body;
    writeDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando horarios' });
  }
});
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { comprobanteTurnoHTML } from './emailTemplates/comprobanteTurno.js';
import { recuperarPasswordHTML } from './emailTemplates/recuperarPassword.js';

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

transporter.verify().then(() => console.log('SMTP listo')).catch(e => console.error('Error SMTP', e.message));

const dbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db.json');
const readDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

app.post('/api/email/comprobante', async (req, res) => {
  try {
    const { to, nombre, servicios, seña, total, pagoId } = req.body;
    if (!to || !servicios?.length) return res.status(400).json({ error: 'Datos insuficientes' });
    const html = comprobanteTurnoHTML({ nombre, servicios, seña, total, pagoId });
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject: 'Comprobante de Seña - Delfina Nails Studio', html });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error enviando comprobante' });
  }
});

app.post('/api/auth/recover-request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    const db = readDB();
    const usuario = db.usuarios.find(u => u.email === email);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    const token = Math.random().toString(36).substring(2,8).toUpperCase();
    usuario.resetToken = token;
    usuario.resetTokenExpires = Date.now() + 30 * 60 * 1000;
    writeDB(db);
    const html = recuperarPasswordHTML({ nombre: usuario.nombre || 'Cliente', token });
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to: email, subject: 'Recuperar contraseña', html });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en recuperación' });
  }
});

app.post('/api/auth/recover', (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const db = readDB();
    const usuario = db.usuarios.find(u => u.email === email);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (usuario.resetToken !== token || Date.now() > usuario.resetTokenExpires) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }
    usuario.password = newPassword;
    delete usuario.resetToken;
    delete usuario.resetTokenExpires;
    writeDB(db);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al restablecer' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Servidor backend en puerto', PORT));
