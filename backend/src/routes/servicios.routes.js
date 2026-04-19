import { Router } from "express";
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/servicios.controllers.js";
import * as pgControllers from "../controllers_pg/servicios.controllers.js";

const router = Router();

const pick = () => (isPostgres() ? pgControllers : mongoControllers);
const h = (name) => (req, res, next) => pick()[name](req, res, next);

router.get("/", h('obtenerServicios'));
router.get("/:id", h('obtenerServicio'));
router.post("/", h('crearServicio'));
router.put("/:id", h('actualizarServicio'));
router.delete("/:id", h('eliminarServicio'));

export default router;
