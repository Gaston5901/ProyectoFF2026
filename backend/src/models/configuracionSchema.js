import mongoose from "mongoose";

const configuracionSchema = new mongoose.Schema({
  horaInicio: { type: String, default: "08:00" },
  horaFin: { type: String, default: "20:00" },
  diasLaborales: { type: [Number], default: [1,2,3,4,5,6] },
  porcentajeSeña: { type: Number, default: 50 },
  emailNotificaciones: { type: String, default: "" },
  horariosPorDia: { type: Object, default: {} }
}, { timestamps: true });

export default mongoose.model("Configuracion", configuracionSchema);
