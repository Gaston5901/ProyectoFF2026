import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// Token privado del servidor para consumir la API oficial de Mercado Pago.
const accessToken = process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
  // No tiramos error al importar para no romper el arranque en entornos sin MP;
  // los endpoints que lo usen devolverán un 500 con mensaje claro.
  console.warn("[MercadoPago] Falta MP_ACCESS_TOKEN en el entorno");
}

// Cliente principal de Mercado Pago configurado con el token del entorno.
export const mpClient = new MercadoPagoConfig({
  accessToken: accessToken || "",
});

// Cliente para crear preferencias de pago.
export const preferenceClient = new Preference(mpClient);
// Cliente para consultar pagos existentes.
export const paymentClient = new Payment(mpClient);
