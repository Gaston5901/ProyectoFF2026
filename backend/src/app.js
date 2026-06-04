import express from "express";
import cors from "cors";
import pagoRoutes from "./routes/pagoRoutes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import turnosRoutes from "./routes/turnos.routes.js";

// App base de Express: aquí se registran middlewares y rutas.
const app = express();

// Habilita CORS para que el frontend pueda consumir la API.
app.use(cors());
// Permite recibir cuerpos grandes, por ejemplo archivos o datos en base64.
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
// Sirve archivos estáticos desde la carpeta public.
app.use(express.static('public'));

// Rutas relacionadas con pagos.
app.use("/api/pagos", pagoRoutes);
// Webhooks y callbacks del backend.
app.use("/api", webhookRoutes);
// Gestión de turnos.
app.use("/api/turnos", turnosRoutes);

// Exporta la app para que el servidor la pueda levantar.
export default app;
