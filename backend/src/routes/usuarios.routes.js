import { Router } from "express";
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/usuarios.controllers.js";
import * as pgControllers from "../controllers_pg/usuarios.controllers.js";
import { validarUsuario, validarUsuarioUpdate } from "../helpers/validarUsuario.js";
import { validationResult } from "express-validator";
import { optionalAuth, requireAuth, requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

// Selecciona el controlador correcto según la base de datos activa.
const pick = () => (isPostgres() ? pgControllers : mongoControllers);
// Evita duplicar handlers cuando cambia el motor de persistencia.
const h = (name) => (req, res, next) => pick()[name](req, res, next);

// Operaciones sensibles: solo superadmin autenticado.
router.get("/", requireAuth, requireSuperAdmin, h('obtenerUsuarios'));
router.get("/:id", requireAuth, requireSuperAdmin, h('obtenerUsuario'));
// Login público para iniciar sesión y obtener sesión/token.
router.post("/login", h('login'));
// Recuperación de password para usuarios que olvidaron sus credenciales.
router.post("/recuperar-password", h('recuperarPassword'));
// Resetea la password usando el flujo de recuperación.
router.post("/resetear-password", h('resetearPassword'));
// Cambia la password del usuario autenticado.
router.post("/cambiar-password", requireAuth, h('cambiarPassword'));

// Registro público: por defecto crea clientes; con token puede usarse para roles más altos.
router.post("/", optionalAuth, validarUsuario, (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errores: errors.array() });
	}
	// Delega la creación al controlador correcto después de validar.
	pick().crearUsuario(req, res, next);
});

// Actualización completa de usuario, restringida a superadmin.
router.put("/:id", requireAuth, requireSuperAdmin, validarUsuarioUpdate, (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errores: errors.array() });
	}
	// Aplica la actualización solo cuando los datos pasan validación.
	pick().actualizarUsuario(req, res, next);
});
// Eliminación de usuarios, también restringida a superadmin.
router.delete("/:id", requireAuth, requireSuperAdmin, h('eliminarUsuario'));

export default router;
