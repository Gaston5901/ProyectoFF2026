import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const accessToken = process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
  // No tiramos error al importar para no romper el arranque en entornos sin MP;
  // los endpoints que lo usen devolverán un 500 con mensaje claro.
  console.warn("[MercadoPago] Falta MP_ACCESS_TOKEN en el entorno");
}

export const mpClient = new MercadoPagoConfig({
  accessToken: accessToken || "",
});

export const preferenceClient = new Preference(mpClient);
export const paymentClient = new Payment(mpClient);
