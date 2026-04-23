import ServiciosModel from "../models/serviciosSchema.js";
import TurnosModel from "../models/turnosSchema.js";

export const crearServicio = async (req, res) => {
  try {
    const servicio = new ServiciosModel(req.body);
    await servicio.save();
    const obj = servicio.toObject();
    obj.id = obj._id;
    delete obj._id;
    res.status(201).json(obj);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

export const obtenerServicios = async (req, res) => {
  try {
    // Solo servicios activos (no archivados)
    const servicios = await ServiciosModel.find({ activo: { $ne: false } });
    const serviciosMap = servicios.map(s => {
      const obj = s.toObject();
      obj.id = obj._id;
      delete obj._id;
      return obj;
    });
    res.json(serviciosMap);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

export const obtenerServicio = async (req, res) => {
  try {
    const servicio = await ServiciosModel.findById(req.params.id);
    if (!servicio) return res.status(404).json({ mensaje: "Servicio no encontrado" });
    if (!servicio) return res.status(404).json({ mensaje: "Servicio no encontrado" });
    const obj = servicio.toObject();
    obj.id = obj._id;
    delete obj._id;
    res.json(obj);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

export const actualizarServicio = async (req, res) => {
  try {
    const servicio = await ServiciosModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!servicio) return res.status(404).json({ mensaje: "Servicio no encontrado" });
    if (!servicio) return res.status(404).json({ mensaje: "Servicio no encontrado" });
    const obj = servicio.toObject();
    obj.id = obj._id;
    delete obj._id;
    res.json(obj);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

export const eliminarServicio = async (req, res) => {
  try {
    const id = req.params.id;

    const usedCount = await TurnosModel.countDocuments({ servicio: id });
    if (usedCount > 0) {
      const servicio = await ServiciosModel.findByIdAndUpdate(
        id,
        { activo: false },
        { new: true }
      );
      if (!servicio) return res.status(404).json({ mensaje: "Servicio no encontrado" });
      return res.json({
        mensaje: `Servicio archivado (tenía ${usedCount} turno(s) asociado(s)).`,
        servicio: { ...servicio.toObject(), id: servicio._id },
      });
    }

    const servicio = await ServiciosModel.findByIdAndDelete(id);
    if (!servicio) return res.status(404).json({ mensaje: "Servicio no encontrado" });
    res.json({ mensaje: "Servicio eliminado" });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
