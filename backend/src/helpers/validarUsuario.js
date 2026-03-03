import { body } from "express-validator";

export const validarUsuario = [
  body("nombre", "El nombre es obligatorio").notEmpty().isLength({ min: 2 }),
  body("email", "El email es obligatorio").notEmpty().isEmail(),
  body("telefono", "El teléfono es obligatorio").notEmpty().isLength({ min: 6 }),
  body("password", "La contraseña es obligatoria y debe tener al menos 6 caracteres").notEmpty().isLength({ min: 6 }),
  body("rol").optional().isIn(["cliente", "usuario", "admin", "superadmin"])
];

export const validarUsuarioUpdate = [
  body("nombre").optional().notEmpty().isLength({ min: 2 }),
  body("email").optional().notEmpty().isEmail(),
  body("telefono").optional().notEmpty().isLength({ min: 6 }),
  body("password").optional().notEmpty().isLength({ min: 6 }),
  body("rol").optional().isIn(["cliente", "usuario", "admin", "superadmin"])
];
