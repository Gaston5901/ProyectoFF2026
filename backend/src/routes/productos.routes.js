import { Router } from "express";
import { validarProducto } from "../helpers/validarProducto";
import { resultadoValidacion } from "../helpers/resultadoValidacion";
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/productos.controllers";
import * as pgControllers from "../controllers_pg/productos.controllers.js";


const router = Router();

const pick = () => (isPostgres() ? pgControllers : mongoControllers);
const h = (name) => (req, res, next) => pick()[name](req, res, next);

router.get("/", h('obtenerProductos'));
router.post("/", validarProducto, resultadoValidacion, h('crearProducto'));
router.put("/:id", validarProducto, resultadoValidacion, h('actualizarProducto'));
router.delete("/:id", h('eliminarProducto'));
router.get("/:id", h('obtenerProducto'));

export default router;