import { Router } from "express";
import { validarProducto } from "../helpers/validarProducto";
import { resultadoValidacion } from "../helpers/resultadoValidacion";
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/productos.controllers";
import * as pgControllers from "../controllers_pg/productos.controllers.js";


const router = Router();

// Selecciona automáticamente el set de controladores según la BD activa.
const pick = () => (isPostgres() ? pgControllers : mongoControllers);
// Genera handlers delegados para no duplicar rutas entre Mongo y Postgres.
const h = (name) => (req, res, next) => pick()[name](req, res, next);

// Lista todos los productos.
router.get("/", h('obtenerProductos'));
// Crea un producto validando primero el payload.
router.post("/", validarProducto, resultadoValidacion, h('crearProducto'));
// Actualiza un producto existente con validación previa.
router.put("/:id", validarProducto, resultadoValidacion, h('actualizarProducto'));
// Elimina un producto por ID.
router.delete("/:id", h('eliminarProducto'));
// Obtiene un producto puntual por ID.
router.get("/:id", h('obtenerProducto'));

export default router;