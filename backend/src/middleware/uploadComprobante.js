// Middleware para manejar la subida de comprobantes de transferencia.
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Asegura que exista la carpeta física donde se guardan los comprobantes.
const comprobantesDir = path.resolve('public', 'uploads', 'comprobantes');
if (!fs.existsSync(comprobantesDir)) {
  fs.mkdirSync(comprobantesDir, { recursive: true });
}

// Guarda los archivos en disco dentro de la carpeta de comprobantes.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, comprobantesDir);
  },
  filename: function (req, file, cb) {
    // Genera un nombre único para evitar colisiones entre archivos iguales.
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'comprobante-' + uniqueSuffix + ext);
  }
});

// Permite solo imágenes y PDF; si no pasa, se marca error para responder 400.
const fileFilter = (req, file, cb) => {
  // Imágenes y PDF (alineado con validación del frontend)
  const allowedMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/heic',
    'image/heif',
  ]);

  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExt = new Set([
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.bmp',
    '.heic',
    '.heif',
  ]);

  const ok = allowedMimeTypes.has(String(file.mimetype || '').toLowerCase()) || allowedExt.has(ext);
  if (ok) {
    cb(null, true);
    return;
  }

  // Importante: NO tirar error (evita 500). Dejamos que el controller responda 400.
  req.fileValidationError = 'El comprobante debe ser una imagen o PDF.';
  cb(null, false);
};

// Configuración final de multer para usar en las rutas que suben comprobantes.
const uploadComprobante = multer({ storage, fileFilter });

export default uploadComprobante;
