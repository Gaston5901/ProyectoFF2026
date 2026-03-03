const Servicio = require('../models/Servicio');

// Obtener todos los servicios
exports.getServicios = async (req, res) => {
  try {
    const servicios = await Servicio.find();
    res.json(servicios);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
};

// Crear un servicio
exports.createServicio = async (req, res) => {
  try {
    const nuevoServicio = new Servicio(req.body);
    await nuevoServicio.save();
    res.status(201).json(nuevoServicio);
  } catch (err) {
    res.status(400).json({ error: 'Error al crear servicio' });
  }
};

// Obtener un servicio por ID
exports.getServicioById = async (req, res) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(servicio);
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar servicio' });
  }
};

// Actualizar un servicio
exports.updateServicio = async (req, res) => {
  try {
    const servicio = await Servicio.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(servicio);
  } catch (err) {
    res.status(400).json({ error: 'Error al actualizar servicio' });
  }
};

// Eliminar un servicio
exports.deleteServicio = async (req, res) => {
  try {
    const servicio = await Servicio.findByIdAndDelete(req.params.id);
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json({ mensaje: 'Servicio eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
};
