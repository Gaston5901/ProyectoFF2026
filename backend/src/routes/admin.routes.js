import { Router } from "express";
import { obtenerHistorialUsuario, estadisticasTurnos } from "../controllers/admin.controllers.js";

const router = Router();

// Historial de turnos de un usuario
router.get("/historial/:usuarioId", obtenerHistorialUsuario);
// Estadísticas generales
router.get("/estadisticas/turnos", estadisticasTurnos);

export default router;
