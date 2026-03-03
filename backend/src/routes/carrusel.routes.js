import { Router } from "express";
import { obtenerCarrusel, actualizarCarrusel } from "../controllers/carrusel.controllers.js";

const router = Router();

router.get("/", obtenerCarrusel);
router.put("/", actualizarCarrusel);

export default router;
