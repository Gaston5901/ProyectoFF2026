import express from "express";
import cors from "cors";
import pagoRoutes from "./routes/pagoRoutes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import turnosRoutes from "./routes/turnos.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(express.static('public'));

app.use("/api/pagos", pagoRoutes);
app.use("/api", webhookRoutes);
app.use("/api/turnos", turnosRoutes);
export default app;
