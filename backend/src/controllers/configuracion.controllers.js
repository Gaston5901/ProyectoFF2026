import ConfiguracionModel from "../models/configuracionSchema.js";

// Obtener configuración (incluye horariosPorDia)
export const obtenerConfiguracion = async (req, res) => {
  try {
    let config = await ConfiguracionModel.findOne();
    if (!config) {
      config = await ConfiguracionModel.create({});
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Actualizar configuración (incluye horariosPorDia)
export const actualizarConfiguracion = async (req, res) => {
  try {
    let config = await ConfiguracionModel.findOne();
    if (!config) {
      config = await ConfiguracionModel.create({});
    }
    Object.assign(config, req.body);
    await config.save();
    res.json(config);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Endpoint solo para horariosPorDia
export const obtenerHorariosPorDia = async (req, res) => {
  try {
    let config = await ConfiguracionModel.findOne();
    if (!config) {
      config = await ConfiguracionModel.create({});
    }
    res.json(config.horariosPorDia || {});
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

export const actualizarHorariosPorDia = async (req, res) => {
  try {
    let config = await ConfiguracionModel.findOne();
    if (!config) {
      config = await ConfiguracionModel.create({});
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ mensaje: 'El body debe ser un objeto con arrays de horarios.' });
    }

    const normalizarHora = (raw) => {
      if (typeof raw !== 'string') return null;
      const value = raw.trim();
      if (!value) return null;
      const match = /^(\d{1,2}):(\d{1,2})$/.exec(value);
      if (!match) return null;
      const hh = Number(match[1]);
      const mm = Number(match[2]);
      if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
      if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };

    const ordenarHoras = (a, b) => {
      const [ah, am] = a.split(':').map(Number);
      const [bh, bm] = b.split(':').map(Number);
      return ah !== bh ? ah - bh : am - bm;
    };

    const invalidos = [];
    const sanitizado = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (!Array.isArray(value)) {
        invalidos.push(`${key}: (no es array)`);
        continue;
      }
      const normalizados = [];
      for (const item of value) {
        const n = normalizarHora(item);
        if (!n) invalidos.push(`${key}: ${String(item)}`);
        else normalizados.push(n);
      }
      sanitizado[key] = Array.from(new Set(normalizados)).sort(ordenarHoras);
    }

    if (invalidos.length) {
      return res.status(400).json({
        mensaje: 'Hay horarios inválidos. Usá HH:MM (00:00 a 23:59).',
        invalidos,
      });
    }

    config.horariosPorDia = sanitizado;
    await config.save();
    res.json(config.horariosPorDia);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
