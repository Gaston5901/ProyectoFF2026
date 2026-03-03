import mongoose from "mongoose";


const turnoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuarios",
    required: true
  },
  servicio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Servicios",
    required: true
  },
  fecha: {
    type: Date,
    required: true
  },
  hora: {
    type: String,
    default: ''
  },
    estado: {
      type: String,
      enum: ["pendiente", "en_proceso", "confirmado", "cancelado", "realizado", "completado", "rechazado"],
      default: "pendiente"
    },
  pagoId: {
    type: String,
    default: ''
  },
  montoPagado: {
    type: Number,
    default: 0
  },
  montoTotal: {
    type: Number,
    default: 0
  },
  registroEstadistica: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  nombre: {
    type: String,
    default: ''
  },
  telefono: {
    type: String,
    default: ''
  },
  comentario: {
    type: String,
    default: ''
  },
  emailEnviado: {
    type: Boolean,
    default: false
  },
  // --- Transferencia bancaria ---
  comprobanteTransferencia: {
    type: String, // Ruta o nombre de archivo
    default: ''
  },
  estadoTransferencia: {
    type: String,
    enum: ['pendiente', 'aprobado', 'rechazado', ''],
    default: ''
  },
  motivoRechazoTransferencia: {
    type: String,
    default: ''
  },
  titularTransferencia: {
    type: String,
    default: ''
  },
  metodoTransferencia: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  seniaDevuelta: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model("Turnos", turnoSchema);
