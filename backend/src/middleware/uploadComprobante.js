// Middleware para manejo de archivos de comprobante de transferencia
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Carpeta destino para comprobantes
const comprobantesDir = path.resolve('public', 'uploads', 'comprobantes');
if (!fs.existsSync(comprobantesDir)) {
  fs.mkdirSync(comprobantesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, comprobantesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'comprobante-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Solo imágenes y PDF
  if (/\.(jpg|jpeg|png|pdf)$/i.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes o PDF'), false);
  }
};

const uploadComprobante = multer({ storage, fileFilter });

export default uploadComprobante;
