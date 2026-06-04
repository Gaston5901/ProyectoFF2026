import { Router } from "express";
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/servicios.controllers.js";
import * as pgControllers from "../controllers_pg/servicios.controllers.js";

const router = Router();

// Selecciona el grupo de controladores según la base de datos activa.
const pick = () => (isPostgres() ? pgControllers : mongoControllers);
// Genera handlers delegados para evitar duplicar las rutas.
const h = (name) => (req, res, next) => pick()[name](req, res, next);

// Lista todos los servicios.
router.get("/", h('obtenerServicios'));
// Obtiene un servicio específico por ID.
router.get("/:id", h('obtenerServicio'));
// Crea un nuevo servicio.
router.post("/", h('crearServicio'));
// Actualiza un servicio existente.
router.put("/:id", h('actualizarServicio'));
// Elimina un servicio por ID.
router.delete("/:id", h('eliminarServicio'));

export default router;
