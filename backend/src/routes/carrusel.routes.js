import { Router } from "express";
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/carrusel.controllers.js";
import * as pgControllers from "../controllers_pg/carrusel.controllers.js";

const router = Router();

const pick = () => (isPostgres() ? pgControllers : mongoControllers);
const h = (name) => (req, res, next) => pick()[name](req, res, next);

router.get("/", h('obtenerCarrusel'));
router.put("/", h('actualizarCarrusel'));

export default router;
