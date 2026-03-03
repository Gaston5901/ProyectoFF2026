import ServiciosModel from "../models/serviciosSchema.js";

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
    const servicios = await ServiciosModel.find();
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
    const servicio = await ServiciosModel.findByIdAndDelete(req.params.id);
    if (!servicio) return res.status(404).json({ mensaje: "Servicio no encontrado" });
    res.json({ mensaje: "Servicio eliminado" });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
