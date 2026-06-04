import { useEffect, useState } from 'react';
import './HeroCarousel.css';

// Imágenes locales de respaldo si el backend no devuelve ninguna.
const defaultImages = [
  '/carrusel1.jpg',
  '/carrusel2.jpg',
  '/carrusel3.jpg',
  '/carrusel4.jpg'
];

const HeroCarousel = ({ images }) => {
  // Usa las imágenes recibidas por props si existen; si no, cae al carrusel local.
  const imgs = Array.isArray(images) && images.length > 0
    ? images.filter(img => typeof img === 'string' && img.trim().length > 0)
    : defaultImages;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // Cambia de imagen cada 3.5 segundos para crear el efecto de carrusel.
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % imgs.length);
    }, 3500);
    // Limpia el intervalo al desmontar el componente o cambiar la lista de imágenes.
    return () => clearInterval(interval);
  }, [imgs.length]);

  return (
    <div className="hero-carousel">
      {imgs.map((img, idx) => (
        <img
          key={img+idx}
          src={img}
          alt={`Carrusel ${idx+1}`}
          // Solo la imagen activa queda visible por encima de las demás.
          className={`carousel-img${idx === current ? ' active' : ''}`}
          style={{zIndex: idx === current ? 2 : 1}}
        />
      ))}
      {/* Puntos que muestran en qué imagen va el carrusel. */}
      <div className="carousel-indicators">
        {imgs.map((_, idx) => (
          <span key={idx} className={idx === current ? 'active' : ''}></span>
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
