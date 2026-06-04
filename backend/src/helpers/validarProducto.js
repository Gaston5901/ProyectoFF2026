import { body } from "express-validator";

// Reglas de validación para crear o editar productos.
export const validarProducto = [
	// Nombre corto pero obligatorio.
	body("nombre", "El nombre es obligatorio").notEmpty().isLength({ min: 2 }),
	// Precio numérico y mayor a cero.
	body("precio", "El precio es obligatorio y debe ser mayor a 0 y numerico").notEmpty().isNumeric().custom((value) => value > 0),
	// Descripción con mínimo de contexto.
	body("descripcion", "La descripción es obligatoria y debe tener al menos 5 caracteres").notEmpty().isLength({ min: 5 }),
	// Imagen obligatoria y con formato URL.
	body("imagen", "La imagen es obligatoria y debe ser una URL válida").notEmpty().isURL()
];
