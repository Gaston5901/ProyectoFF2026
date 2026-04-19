import { Router } from "express";
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/configuracion.controllers.js";
import * as pgControllers from "../controllers_pg/configuracion.controllers.js";

const router = Router();

const pick = () => (isPostgres() ? pgControllers : mongoControllers);
const h = (name) => (req, res, next) => pick()[name](req, res, next);

router.get("/", h('obtenerConfiguracion'));
router.patch("/", h('actualizarConfiguracion'));

// Horarios por día (estructura igual a db.json)
router.get("/horariosPorDia", h('obtenerHorariosPorDia'));
router.put("/horariosPorDia", h('actualizarHorariosPorDia'));

export default router;
