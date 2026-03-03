import { useEffect, useState } from 'react';
import './HeroCarousel.css';

const defaultImages = [
  '/carrusel1.jpg',
  '/carrusel2.jpg',
  '/carrusel3.jpg',
  '/carrusel4.jpg'
];

const HeroCarousel = ({ images }) => {
  // Filtrar imágenes válidas (URL, base64, etc)
  const imgs = Array.isArray(images) && images.length > 0
    ? images.filter(img => typeof img === 'string' && img.trim().length > 0)
    : defaultImages;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % imgs.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [imgs.length]);

  return (
    <div className="hero-carousel">
      {imgs.map((img, idx) => (
        <img
          key={img+idx}
          src={img}
          alt={`Carrusel ${idx+1}`}
          className={`carousel-img${idx === current ? ' active' : ''}`}
          style={{zIndex: idx === current ? 2 : 1}}
        />
      ))}
      <div className="carousel-indicators">
        {imgs.map((_, idx) => (
          <span key={idx} className={idx === current ? 'active' : ''}></span>
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
