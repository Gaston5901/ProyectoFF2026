import { validationResult } from "express-validator";

export const resultadoValidacion = (req, res, next) => {
	const errores = validationResult(req);
	if (!errores.isEmpty()) {
		// Solo retorna el primer error
		return res.status(400).json({ error: errores.array()[0] });
	}
	next();
};
