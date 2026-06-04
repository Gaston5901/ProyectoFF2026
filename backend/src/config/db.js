import mongoose from "mongoose";

// Conecta Mongoose a la URI definida en MONGO_URI.
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    // Log de confirmación cuando la conexión se establece correctamente.
    console.log("MongoDB conectado");
  } catch (error) {
    // Si falla la conexión, reporta el error en consola.
    console.error("Error MongoDB", error);
  }
};
   