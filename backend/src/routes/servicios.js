const express = require('express');
const router = express.Router();
const servicioController = require('../controllers/servicioController');

// /api/servicios
router.get('/', servicioController.getServicios);
router.post('/', servicioController.createServicio);
router.get('/:id', servicioController.getServicioById);
router.put('/:id', servicioController.updateServicio);
router.delete('/:id', servicioController.deleteServicio);

module.exports = router;
