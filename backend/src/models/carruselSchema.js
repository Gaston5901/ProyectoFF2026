import mongoose from "mongoose";

const carruselSchema = new mongoose.Schema({
  imagenes: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

export default mongoose.model("Carrusel", carruselSchema);
