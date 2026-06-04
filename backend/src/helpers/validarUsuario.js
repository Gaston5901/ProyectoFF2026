import { body } from "express-validator";

// Reglas de validación para crear usuarios.
export const validarUsuario = [
  // Datos básicos obligatorios.
  body("nombre", "El nombre es obligatorio").notEmpty().isLength({ min: 2 }),
  body("email", "El email es obligatorio").notEmpty().isEmail(),
  body("telefono", "El teléfono es obligatorio").notEmpty().isLength({ min: 6 }),
  body("password", "La contraseña es obligatoria y debe tener al menos 6 caracteres").notEmpty().isLength({ min: 6 }),
  // Rol opcional, pero restringido a valores permitidos.
  body("rol").optional().isIn(["cliente", "usuario", "admin", "superadmin"])
];

// Reglas de validación para actualizar usuarios.
export const validarUsuarioUpdate = [
  // En update todo es opcional, pero si viene debe ser válido.
  body("nombre").optional().notEmpty().isLength({ min: 2 }),
  body("email").optional().notEmpty().isEmail(),
  body("telefono").optional().notEmpty().isLength({ min: 6 }),
  body("password").optional().notEmpty().isLength({ min: 6 }),
  body("rol").optional().isIn(["cliente", "usuario", "admin", "superadmin"]),
  body("suspendido").optional().isBoolean(),
  body("oculto").optional().isBoolean(),
];
