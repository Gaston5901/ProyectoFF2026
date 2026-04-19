// ...existing code...
import { Router } from "express";
const router = Router();
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/turnos.controllers.js";
import * as pgControllers from "../controllers_pg/turnos.controllers.js";
import uploadComprobante from "../middleware/uploadComprobante.js";
import TurnosModel from "../models/turnosSchema.js";
import { pgQuery } from "../database/postgres.js";

const pick = () => (isPostgres() ? pgControllers : mongoControllers);
const h = (name) => (req, res, next) => pick()[name](req, res, next);
// Endpoint para obtener turnos en proceso (transferencia)
router.get("/en-proceso", h('obtenerTurnosEnProceso'));

// Contador de turnos en_proceso (solo transferencia)
router.get('/en-proceso/count', async (req, res) => {
  try {
    if (isPostgres()) {
      const { rows } = await pgQuery(
        `SELECT count(*)::int AS count
         FROM turnos
         WHERE estado = 'en_proceso'
           AND (coalesce(comprobante_path, '') <> '' OR coalesce(metodo_transferencia, '') <> '')`
      );
      return res.json({ count: Number(rows?.[0]?.count || 0) });
    }

    const count = await TurnosModel.countDocuments({
      estado: 'en_proceso',
      $or: [
        { comprobanteTransferencia: { $exists: true, $ne: '' } },
        { metodoTransferencia: { $exists: true, $ne: '' } }
      ]
    });
    return res.json({ count });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

// Endpoints admin para aprobar/rechazar transferencia
router.patch("/:id/aprobar-transferencia", h('aprobarTransferencia'));
router.patch("/:id/rechazar-transferencia", h('rechazarTransferencia'));

// Turnos por usuario (debe ir antes de /:id)
router.get("/usuario/:usuarioId", h('obtenerTurnosPorUsuario'));

router.get("/", h('obtenerTurnos'));
router.get("/:id", h('obtenerTurno'));
router.post("/", h('crearTurno'));
// Nuevo endpoint para turnos con transferencia
router.post("/transferencia", uploadComprobante.single('comprobante'), h('crearTurnoTransferencia'));
router.put("/:id", h('actualizarTurno'));
router.delete("/:id", h('eliminarTurno'));

// Endpoint para marcar seña como devuelta
router.patch("/:id/devolver-senia", h('devolverSenia'));

export default router;
