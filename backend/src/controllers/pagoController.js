import { preferenceClient } from "../config/mercadopago.js";

export async function crearPreferencia(req, res) {
  try {
    const { carrito, metadata } = req.body || {};

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: "Falta MP_ACCESS_TOKEN en el backend" });
    }

    if (!Array.isArray(carrito) || carrito.length === 0) {
      return res.status(400).json({ error: "Carrito inválido" });
    }

    const items = carrito.map((item) => {
      const unitPrice = Number(item.precio ?? item.unit_price ?? 0);
      const quantity = Number(item.cantidad ?? item.quantity ?? 1);
      return {
        title: item.titulo ?? item.title ?? "Servicio",
        unit_price: unitPrice,
        quantity,
        currency_id: "ARS",
      };
    });

    const invalidItem = items.find(
      (it) => !it.title || !Number.isFinite(it.unit_price) || it.unit_price <= 0 || !Number.isFinite(it.quantity) || it.quantity <= 0
    );
    if (invalidItem) {
      return res.status(400).json({
        error: "Items inválidos para Mercado Pago",
      });
    }

    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const backendBaseUrl = process.env.BACKEND_URL || "http://localhost:4000";

    const isLocalhost = (url) => /localhost|127\.0\.0\.1/i.test(url || "");
    const backendBase = String(backendBaseUrl || "").replace(/\/$/, "");

    // En local, Mercado Pago no puede llamar a localhost como webhook.
    // Usamos MP_WEBHOOK_URL si existe; si no, usamos BACKEND_URL si es publico.
    const notificationUrl =
      process.env.MP_WEBHOOK_URL ||
      (!isLocalhost(backendBase) ? `${backendBase}/api/webhook` : undefined);

    const backUrls = {
      success: `${frontendBaseUrl}/pago-exitoso`,
      failure: `${frontendBaseUrl}/pago-fallido`,
      pending: `${frontendBaseUrl}/pago-pendiente`,
    };

    // En local (localhost) Mercado Pago suele rechazar auto_return.
    // Habilitarlo solo si el usuario lo configura explícitamente.
    const autoReturn = process.env.MP_AUTO_RETURN || undefined;

    const body = {
      items,
      // Mercado Pago usa back_urls, pero algunos mensajes de error referencian back_url.
      // Mandamos ambos para máxima compatibilidad.
      back_urls: backUrls,
      back_url: backUrls,
      auto_return: autoReturn,
      notification_url: notificationUrl,
      metadata: metadata && typeof metadata === "object" ? metadata : undefined,
    };

    const result = await preferenceClient.create({ body });

    res.json({
      init_point: result.init_point || result.sandbox_init_point,
      sandbox_init_point: result.sandbox_init_point,
      preference_id: result.id,
    });
  } catch (error) {
    const status = error?.status || error?.response?.status || 500;
    const mpMessage =
      error?.message ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      "Error creando preferencia";

    console.error("Error creando preferencia:", status, mpMessage);

    res.status(Number(status) || 500).json({
      error: mpMessage,
    });
  }
}
