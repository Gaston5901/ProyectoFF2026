const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
	// Mantener comportamiento no-fatal en require
	// (los endpoints fallarán al usarlo si no hay token)
	console.warn("[MercadoPago] Falta MP_ACCESS_TOKEN en el entorno");
}

const client = new MercadoPagoConfig({ accessToken: accessToken || "" });
const preference = new Preference(client);
const payment = new Payment(client);

// Wrapper de compatibilidad con API vieja que el proyecto usaba:
// - mercadopago.preferences.create(preferenceObject) -> { body: result }
// - mercadopago.payment.findById(id) -> { body: result }
module.exports = {
	preferences: {
		create: async (pref) => {
			const body = pref && pref.body ? pref.body : pref;
			const result = await preference.create({ body });
			return { body: result };
		},
	},
	payment: {
		findById: async (id) => {
			const result = await payment.get({ id });
			return { body: result };
		},
	},
};
