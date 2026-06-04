import { validationResult } from "express-validator";

// Middleware que corta la request si `express-validator` detectó errores.
export const resultadoValidacion = (req, res, next) => {
	// Reúne los errores acumulados por los validadores previos.
	const errores = validationResult(req);
	if (!errores.isEmpty()) {
		// Solo retorna el primer error
		// Responde con 400 para que el frontend vea el problema de entrada.
		return res.status(400).json({ error: errores.array()[0] });
	}

	// Si todo está bien, deja pasar a la siguiente capa.
	next();
};
