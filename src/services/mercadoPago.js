import { API_BASE_URL } from '../config/apiBaseUrl.js';

export const crearPreferencia = async (carrito, metadata) => {
  const res = await fetch(`${API_BASE_URL}/pagos/crear-preferencia`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ carrito, metadata })
  });

  return res.json();
};
