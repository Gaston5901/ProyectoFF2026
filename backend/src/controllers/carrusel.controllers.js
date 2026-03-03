import CarruselModel from "../models/carruselSchema.js";

export const obtenerCarrusel = async (req, res) => {
  try {
    let carrusel = await CarruselModel.findOne();
    if (!carrusel) {
      carrusel = await CarruselModel.create({ imagenes: [] });
    }
    res.json({ imagenes: carrusel.imagenes });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

export const actualizarCarrusel = async (req, res) => {
  try {
    const { imagenes } = req.body;

    if (!Array.isArray(imagenes)) {
      return res.status(400).json({ mensaje: 'El campo "imagenes" debe ser un array.' });
    }
    if (imagenes.length > 4) {
      return res.status(400).json({ mensaje: 'Solo puedes tener hasta 4 imágenes en el carrusel.' });
    }
    const imagenesLimpias = imagenes
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);

    if (imagenesLimpias.length !== imagenes.length) {
      return res.status(400).json({ mensaje: 'Todas las imágenes deben ser strings (URL o data URL).' });
    }

    // Si mandan data URLs (base64), evitamos tamaños excesivos.
    // Nota: esto es una protección básica; idealmente, subir archivos (multipart) y guardar URL.
    // 14MB de archivo en base64 suele ocupar ~19MB; dejamos margen.
    const MAX_DATA_URL_CHARS = 25_000_000;
    const tooLarge = imagenesLimpias.find(
      (v) => v.startsWith('data:image/') && v.length > MAX_DATA_URL_CHARS
    );
    if (tooLarge) {
      return res.status(413).json({
        mensaje: 'La imagen es demasiado grande. Probá con una más liviana (o subila a un hosting y pegá la URL).'
      });
    }

    let carrusel = await CarruselModel.findOne();
    if (!carrusel) {
      carrusel = await CarruselModel.create({ imagenes: imagenesLimpias });
    } else {
      carrusel.imagenes = imagenesLimpias;
      await carrusel.save();
    }
    res.json({ imagenes: carrusel.imagenes });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};
