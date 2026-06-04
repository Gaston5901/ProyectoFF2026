import app from "./app.js";
import { connectDB } from "./config/db.js";

// Conecta la aplicación a la base de datos antes de levantar el servidor.
connectDB();

// Puerto donde escuchará el backend; usa el definido en producción o 3001 en local.
const PORT = process.env.PORT || 3001;

// Arranca el servidor HTTP con la app de Express.
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});
