import { Router } from "express";
import {
  crearServicio,
  obtenerServicios,
  obtenerServicio,
  actualizarServicio,
  eliminarServicio
} from "../controllers/servicios.controllers.js";

const router = Router();

router.get("/", obtenerServicios);
router.get("/:id", obtenerServicio);
router.post("/", crearServicio);
router.put("/:id", actualizarServicio);
router.delete("/:id", eliminarServicio);

export default router;
