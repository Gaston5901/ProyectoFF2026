import { Router } from "express";
import { crearPreferencia } from "../controllers/pagoController.js";

const router = Router();

router.post("/crear-preferencia", crearPreferencia);

export default router;
