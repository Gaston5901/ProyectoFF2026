import { Router } from "express";
import { crearPreferencia } from "../controllers/pagoController.js";

const router = Router();

// Crea una preferencia de pago para iniciar el flujo con Mercado Pago.
router.post("/crear-preferencia", crearPreferencia);

export default router;
