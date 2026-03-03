import { Router } from "express";
import { obtenerConfiguracion, actualizarConfiguracion, obtenerHorariosPorDia, actualizarHorariosPorDia } from "../controllers/configuracion.controllers.js";

const router = Router();

router.get("/", obtenerConfiguracion);
router.patch("/", actualizarConfiguracion);

// Horarios por día (estructura igual a db.json)
router.get("/horariosPorDia", obtenerHorariosPorDia);
router.put("/horariosPorDia", actualizarHorariosPorDia);

export default router;
