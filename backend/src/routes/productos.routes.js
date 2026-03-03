import { Router } from "express";
import { validarProducto } from "../helpers/validarProducto";
import { resultadoValidacion } from "../helpers/resultadoValidacion";
import { obtenerProductos,crearProducto,actualizarProducto,eliminarProducto, obtenerProducto } from "../controllers/productos.controllers";


const router = Router();

router.get("/", obtenerProductos);
router.post("/", validarProducto, resultadoValidacion, crearProducto);
router.put("/:id", validarProducto, resultadoValidacion, actualizarProducto);
router.delete("/:id", eliminarProducto);
router.get("/:id", obtenerProducto);

export default router;