import { API_BASE_URL } from '../config/apiBaseUrl.js';

// Crea una preferencia de pago en el backend para iniciar el checkout de Mercado Pago.
export const crearPreferencia = async (carrito, metadata) => {
  // Enviamos el carrito y metadatos al backend, que arma la preferencia real.
  const res = await fetch(`${API_BASE_URL}/pagos/crear-preferencia`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ carrito, metadata })
  });

  return res.json();
};
