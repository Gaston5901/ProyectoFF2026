import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // Nota: existe un índice único en Mongo sobre `username` (p.ej. username_1).
    // Si no guardamos un valor aquí, Mongo interpreta el campo ausente como null y falla con E11000.
    // Para compatibilidad, usamos el email como username por defecto.
    username: {
      type: String,
      trim: true,
      lowercase: true,
    },
    telefono: {
      type: String,
      default: "",
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    rol: {
      type: String,
      enum: ["cliente", "usuario", "admin", "superadmin"],
      default: "cliente",
    },

    passwordResetTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

usuarioSchema.pre("save", async function (next) {
  // Asegurar username para evitar duplicados por `null` con índice único en DB
  if (!this.username && this.email) {
    this.username = String(this.email).toLowerCase().trim();
  }

  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

usuarioSchema.methods.compararPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("Usuarios", usuarioSchema);