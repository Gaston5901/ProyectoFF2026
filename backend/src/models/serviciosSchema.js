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
  }
}, {
  timestamps: true
});

export default mongoose.model("Servicios", servicioSchema);
