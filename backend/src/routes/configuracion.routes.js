import { Router } from "express";
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/configuracion.controllers.js";
import * as pgControllers from "../controllers_pg/configuracion.controllers.js";

const router = Router();

// Elige automáticamente el set de controladores según la base activa.
const pick = () => (isPostgres() ? pgControllers : mongoControllers);
// Delegador que evita duplicar rutas para Mongo y Postgres.
const h = (name) => (req, res, next) => pick()[name](req, res, next);

// Devuelve o actualiza la configuración general del sistema.
router.get("/", h('obtenerConfiguracion'));
router.patch("/", h('actualizarConfiguracion'));

// Lee y actualiza los horarios disponibles por día.
router.get("/horariosPorDia", h('obtenerHorariosPorDia'));
router.put("/horariosPorDia", h('actualizarHorariosPorDia'));

export default router;
