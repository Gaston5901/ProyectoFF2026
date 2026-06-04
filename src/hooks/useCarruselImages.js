import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/apiBaseUrl.js';

// Hook que trae las imágenes del carrusel desde el backend.
export default function useCarruselImages() {
  const [imagenes, setImagenes] = useState([]);

  useEffect(() => {
    // Timer para mostrar un aviso si la API tarda demasiado.
    let avisoTimeout = null;
    // Marca si el toast de conexión lenta llegó a mostrarse.
    let avisoMostrado = false;

    // A los 4 segundos avisamos que la carga puede demorar.
    avisoTimeout = setTimeout(() => {
      avisoMostrado = true;
      toast.info('Conexion lenta. Esto puede tardar un momento...', { autoClose: 4000 });
    }, 4000);

    // Consulta al endpoint del carrusel y guarda las imágenes recibidas.
    fetch(`${API_BASE_URL}/carrusel`)
      .then(res => res.json())
      .then(data => setImagenes(Array.isArray(data.imagenes) ? data.imagenes : []))
      .catch(() => setImagenes([]))
      .finally(() => {
        // Si la respuesta llegó antes del timeout, cancelamos el aviso.
        if (avisoTimeout) {
          clearTimeout(avisoTimeout);
        }
        // Si el toast llegó a mostrarse, lo cerramos al terminar la carga.
        if (avisoMostrado) {
          toast.dismiss();
        }
      });

    return () => {
      // Limpieza del timeout al desmontar el componente.
      if (avisoTimeout) {
        clearTimeout(avisoTimeout);
      }
    };
  }, []);

  return imagenes;
}
