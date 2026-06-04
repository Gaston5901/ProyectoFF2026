import { Router } from "express";
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/carrusel.controllers.js";
import * as pgControllers from "../controllers_pg/carrusel.controllers.js";

const router = Router();

// Selecciona el set de controladores según el motor de base de datos activo.
const pick = () => (isPostgres() ? pgControllers : mongoControllers);
// Crea handlers que delegan en el controlador correcto sin duplicar rutas.
const h = (name) => (req, res, next) => pick()[name](req, res, next);

// Obtiene la configuración actual del carrusel.
router.get("/", h('obtenerCarrusel'));
// Actualiza la configuración del carrusel.
router.put("/", h('actualizarCarrusel'));

export default router;
