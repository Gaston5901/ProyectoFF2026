import { Router } from "express";
import { obtenerHistorialUsuario, estadisticasTurnos } from "../controllers/admin.controllers.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

// Historial de turnos de un usuario
router.get("/historial/:usuarioId", requireAuth, requireSuperAdmin, obtenerHistorialUsuario);
// Estadísticas generales
router.get("/estadisticas/turnos", requireAuth, requireSuperAdmin, estadisticasTurnos);

export default router;
