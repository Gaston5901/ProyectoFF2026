import mongoose from "mongoose";

const pagoSchema = new mongoose.Schema({
  paymentId: String,
  estado: String,
  monto: Number,
  fecha: { type: Date, default: Date.now }
});

export default mongoose.model("Pago", pagoSchema);
