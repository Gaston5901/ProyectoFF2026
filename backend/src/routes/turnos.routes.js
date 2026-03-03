// ...existing code...
import { Router } from "express";
const router = Router();
import {
  crearTurno,
  crearTurnoTransferencia,
  obtenerTurnos,
  obtenerTurno,
  actualizarTurno,
  eliminarTurno,
  obtenerTurnosPorUsuario,
  devolverSenia,
  aprobarTransferencia,
  rechazarTransferencia,
  obtenerTurnosEnProceso
} from "../controllers/turnos.controllers.js";
import uploadComprobante from "../middleware/uploadComprobante.js";
import TurnosModel from "../models/turnosSchema.js";
// Endpoint para obtener turnos en proceso (transferencia)
router.get("/en-proceso", obtenerTurnosEnProceso);

// Contador de turnos en_proceso (solo transferencia)
router.get('/en-proceso/count', async (req, res) => {
  try {
    const count = await TurnosModel.countDocuments({
      estado: 'en_proceso',
      $or: [
        { comprobanteTransferencia: { $exists: true, $ne: '' } },
        { metodoTransferencia: { $exists: true, $ne: '' } }
      ]
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

// Endpoints admin para aprobar/rechazar transferencia
router.patch("/:id/aprobar-transferencia", aprobarTransferencia);
router.patch("/:id/rechazar-transferencia", rechazarTransferencia);

router.get("/", obtenerTurnos);
router.get("/:id", obtenerTurno);
router.post("/", crearTurno);
// Nuevo endpoint para turnos con transferencia
router.post("/transferencia", uploadComprobante.single('comprobante'), crearTurnoTransferencia);
router.put("/:id", actualizarTurno);
router.delete("/:id", eliminarTurno);
// Turnos por usuario
router.get("/usuario/:usuarioId", obtenerTurnosPorUsuario);

// Endpoint para marcar seña como devuelta
router.patch("/:id/devolver-senia", devolverSenia);

export default router;
