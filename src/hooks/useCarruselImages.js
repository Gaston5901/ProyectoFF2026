import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/apiBaseUrl.js';

// Hook para obtener imágenes del carrusel desde la API
export default function useCarruselImages() {
  const [imagenes, setImagenes] = useState([]);

  useEffect(() => {
    let avisoTimeout = null;
    let avisoMostrado = false;

    avisoTimeout = setTimeout(() => {
      avisoMostrado = true;
      toast.info('Conexion lenta. Esto puede tardar un momento...', { autoClose: 4000 });
    }, 4000);

    fetch(`${API_BASE_URL}/carrusel`)
      .then(res => res.json())
      .then(data => setImagenes(Array.isArray(data.imagenes) ? data.imagenes : []))
      .catch(() => setImagenes([]))
      .finally(() => {
        if (avisoTimeout) {
          clearTimeout(avisoTimeout);
        }
        if (avisoMostrado) {
          toast.dismiss();
        }
      });

    return () => {
      if (avisoTimeout) {
        clearTimeout(avisoTimeout);
      }
    };
  }, []);

  return imagenes;
}
