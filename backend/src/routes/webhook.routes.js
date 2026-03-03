import { Router } from "express";
import { paymentClient } from "../config/mercadopago.js";
import { procesarPagoAprobado } from "../helpers/webhookHelper.js";

const router = Router();

// Webhook para Mercado Pago
router.post("/webhook", async (req, res) => {
  try {
    // MP puede mandar: { data: { id } } o query params tipo data.id
    const paymentId =
      req.body?.data?.id ||
      req.body?.id ||
      req.query?.["data.id"] ||
      req.query?.id;

    if (!paymentId) return res.sendStatus(400);
    if (!process.env.MP_ACCESS_TOKEN) return res.sendStatus(500);

    const pago = await paymentClient.get({ id: String(paymentId) });

    if (pago?.status === "approved") {
      await procesarPagoAprobado(pago);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    return res.sendStatus(500);
  }
});

export default router;
