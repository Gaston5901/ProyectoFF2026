const express = require('express');
const router = express.Router();
const servicioController = require('../controllers/servicioController');

// Expone el CRUD de servicios bajo /api/servicios.
// Cada endpoint delega la lógica en `servicioController`.
router.get('/', servicioController.getServicios);
router.post('/', servicioController.createServicio);
router.get('/:id', servicioController.getServicioById);
router.put('/:id', servicioController.updateServicio);
router.delete('/:id', servicioController.deleteServicio);

module.exports = router;
