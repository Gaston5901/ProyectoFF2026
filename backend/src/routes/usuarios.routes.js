import { Router } from "express";
import { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, obtenerUsuario, login, recuperarPassword, resetearPassword } from "../controllers/usuarios.controllers.js";
import { validarUsuario, validarUsuarioUpdate } from "../helpers/validarUsuario.js";
import { validationResult } from "express-validator";

const router = Router();

router.get("/", obtenerUsuarios);
router.get("/:id", obtenerUsuario);
router.post("/login", login);
router.post("/recuperar-password", recuperarPassword);
router.post("/resetear-password", resetearPassword);
router.post("/", validarUsuario, (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errores: errors.array() });
	}
	crearUsuario(req, res, next);
});

router.put("/:id", validarUsuarioUpdate, (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errores: errors.array() });
	}
	actualizarUsuario(req, res, next);
});
router.delete("/:id", eliminarUsuario);

export default router;
