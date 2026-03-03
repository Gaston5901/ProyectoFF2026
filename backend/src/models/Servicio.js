const mongoose = require('mongoose');

const ServicioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  precio: { type: Number, required: true },
  duracion: { type: Number }, // minutos
  imagen: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Servicio', ServicioSchema);