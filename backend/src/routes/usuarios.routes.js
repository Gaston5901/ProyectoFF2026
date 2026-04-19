import { Router } from "express";
import { isPostgres } from "../config/dbProvider.js";
import * as mongoControllers from "../controllers/usuarios.controllers.js";
import * as pgControllers from "../controllers_pg/usuarios.controllers.js";
import { validarUsuario, validarUsuarioUpdate } from "../helpers/validarUsuario.js";
import { validationResult } from "express-validator";
import { optionalAuth, requireAuth, requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

const pick = () => (isPostgres() ? pgControllers : mongoControllers);
const h = (name) => (req, res, next) => pick()[name](req, res, next);

// Datos sensibles: solo superadmin
router.get("/", requireAuth, requireSuperAdmin, h('obtenerUsuarios'));
router.get("/:id", requireAuth, requireSuperAdmin, h('obtenerUsuario'));
router.post("/login", h('login'));
router.post("/recuperar-password", h('recuperarPassword'));
router.post("/resetear-password", h('resetearPassword'));

// Registro público: siempre crea rol cliente. Superadmin puede usar este endpoint con token para crear admin/superadmin.
router.post("/", optionalAuth, validarUsuario, (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errores: errors.array() });
	}
	pick().crearUsuario(req, res, next);
});

router.put("/:id", requireAuth, requireSuperAdmin, validarUsuarioUpdate, (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errores: errors.array() });
	}
	pick().actualizarUsuario(req, res, next);
});
router.delete("/:id", requireAuth, requireSuperAdmin, h('eliminarUsuario'));

export default router;
