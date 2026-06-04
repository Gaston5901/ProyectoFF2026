const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Devuelve el listado de usuarios registrados.
router.get('/', usuarioController.getUsuarios);
// Crea un usuario nuevo.
router.post('/', usuarioController.createUsuario);
// Inicia sesión y devuelve credenciales/token.
router.post('/login', usuarioController.login);
// Obtiene un usuario puntual por ID.
router.get('/:id', usuarioController.getUsuarioById);
// Actualiza los datos de un usuario existente.
router.put('/:id', usuarioController.updateUsuario);

module.exports = router;
