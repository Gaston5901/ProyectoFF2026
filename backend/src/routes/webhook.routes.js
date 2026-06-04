import { Router } from "express";
import { paymentClient } from "../config/mercadopago.js";
import { procesarPagoAprobado } from "../helpers/webhookHelper.js";

const router = Router();

// Recibe notificaciones de Mercado Pago y sincroniza el estado del pago.
router.post("/webhook", async (req, res) => {
  try {
    // Mercado Pago puede enviar el ID en el body o en query params.
    const paymentId =
      req.body?.data?.id ||
      req.body?.id ||
      req.query?.["data.id"] ||
      req.query?.id;

    // Sin ID no hay nada que consultar.
    if (!paymentId) return res.sendStatus(400);
    // Sin token configurado no se puede consultar el pago.
    if (!process.env.MP_ACCESS_TOKEN) return res.sendStatus(500);

    // Consulta el pago real en Mercado Pago.
    const pago = await paymentClient.get({ id: String(paymentId) });

    // Si el pago fue aprobado, actualiza turnos y envía comprobantes.
    if (pago?.status === "approved") {
      await procesarPagoAprobado(pago);
    }

    // Siempre responde 200 para que Mercado Pago no reintente innecesariamente.
    return res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    return res.sendStatus(500);
  }
});

export default router;
