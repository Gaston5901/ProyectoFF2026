import mongoose from "mongoose";


const servicioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true
  },
  descripcion: String,
  precio: {
    type: Number,
    required: true
  },
  duracion: {
    type: Number, // minutos
    required: true
  },
  imagen: {
    type: String, // URL de la imagen
    default: ''
  },
  // Soft-delete: cuando un servicio tiene turnos asociados, se archiva
  // para que no se vea ni se pueda seleccionar.
  activo: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true
});

export default mongoose.model("Servicios", servicioSchema);
