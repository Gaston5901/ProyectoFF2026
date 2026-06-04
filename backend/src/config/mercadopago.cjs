const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

// Token privado del servidor para hablar con la API de Mercado Pago.
const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
	// Mantener comportamiento no-fatal en require
	// (los endpoints fallarán al usarlo si no hay token)
	console.warn("[MercadoPago] Falta MP_ACCESS_TOKEN en el entorno");
}

// Cliente oficial de Mercado Pago configurado con el token del entorno.
const client = new MercadoPagoConfig({ accessToken: accessToken || "" });
// Helper para crear preferencias de pago.
const preference = new Preference(client);
// Helper para consultar pagos existentes por ID.
const payment = new Payment(client);


module.exports = {
	preferences: {
		create: async (pref) => {
			// Normaliza la entrada y crea la preferencia en Mercado Pago.
			const body = pref && pref.body ? pref.body : pref;
			const result = await preference.create({ body });
			// Devuelve la respuesta dentro de un objeto body para mantener compatibilidad.
			return { body: result };
		},
	},
	payment: {
		findById: async (id) => {
			// Busca un pago por su identificador en Mercado Pago.
			const result = await payment.get({ id });
			// Misma forma de respuesta que el resto del wrapper.
			return { body: result };
		},
	},
};
