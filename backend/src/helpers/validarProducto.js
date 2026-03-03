import { body } from "express-validator";

export const validarProducto = [
	body("nombre", "El nombre es obligatorio").notEmpty().isLength({ min: 2 }),
	body("precio", "El precio es obligatorio y debe ser mayor a 0 y numerico").notEmpty().isNumeric().custom((value) => value > 0),
	body("descripcion", "La descripción es obligatoria y debe tener al menos 5 caracteres").notEmpty().isLength({ min: 5 }),
	body("imagen", "La imagen es obligatoria y debe ser una URL válida").notEmpty().isURL()
];
