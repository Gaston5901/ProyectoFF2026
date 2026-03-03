import TurnosModel from "../models/turnosSchema.js";

export const obtenerHistorialUsuario = async (req, res) => {
  try {
    const turnos = await TurnosModel.find({ usuario: req.params.usuarioId, estado: { $in: ["realizado", "cancelado"] } }).populate("servicio");
    res.json(turnos);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

export const estadisticasTurnos = async (req, res) => {
  try {
    // Ejemplo: cantidad de turnos por estado
    const stats = await TurnosModel.aggregate([
      { $group: { _id: "$estado", cantidad: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
