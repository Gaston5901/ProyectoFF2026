import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Sparkles, Shield, Award, DollarSign } from 'lucide-react';
import { serviciosAPI, turnosAPI } from '../services/api';
import './Home.css';
import HeroCarousel from '../components/HeroCarousel';
import useCarruselImages from '../hooks/useCarruselImages';

const Home = () => {
  const [destacados, setDestacados] = useState([]);
  const [cargandoDestacados, setCargandoDestacados] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [servRes, turnRes] = await Promise.all([
          serviciosAPI.getAll(),
          turnosAPI.getAll(),
        ]);

        const servicios = servRes.data;
        const turnos = turnRes.data;

        const usos = turnos.reduce((acc, t) => {
          acc[t.servicioId] = (acc[t.servicioId] || 0) + 1;
          return acc;
        }, {});

        const ordenados = [...servicios].sort(
          (a, b) => (usos[b.id] || 0) - (usos[a.id] || 0)
        );

        setDestacados(ordenados.slice(0, 3));
      } catch (err) {
        console.error('Error cargando destacados', err);
      } finally {
        setCargandoDestacados(false);
      }
    };

    cargar();
  }, []);

  const carruselImgs = useCarruselImages();

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <HeroCarousel images={carruselImgs} />
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <div className="hero-logo-container">
            <img src="/logo.png" alt="Logo Delfina Nails" className="hero-logo-img" />
          </div>

          <h1 className="hero-title">
            Delfina Nails Studio
            <span className="hero-subtitle">Belleza en Cada Detalle</span>
          </h1>

          <p className="signature">BY: TRINY ZELARAYAN SANNA</p>

          <p className="hero-description">
            Esmaltado semipermanente, Soft Gel y diseños a mano alzada. Reservá online
          </p>

          <Link to="/reservar" className="btn btn-primary btn-large">
            <Calendar size={24} />
            Reservar Turno Ahora
          </Link>

          <Link to="/servicios" className="btn btn-secondary btn-large">
            Ver Servicios
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title" id="por-que-elegirnos">
            ¿Por qué elegirnos?
          </h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><Clock /></div>
              <h3>Turnos Online</h3>
              <p>Reservá al instante desde tu celular</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon"><Shield /></div>
              <h3>Seña Segura</h3>
              <p>Procesada con Mercado Pago (50%)</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon"><Award /></div>
              <h3>Calidad Profesional</h3>
              <p>Experiencia y dedicación en cada servicio</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon"><Sparkles /></div>
              <h3>Diseños Únicos</h3>
              <p>Arte personalizado para tus uñas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Destacados */}
      <section className="services-preview">
        <div className="container">
          <h2 className="section-title" id="servicios-destacados">Servicios Destacados</h2>
          <p className="section-subtitle">Basado en los más reservados recientemente</p>

          {cargandoDestacados ? (
            <p style={{ textAlign: 'center' }}>Cargando destacados...</p>
          ) : (
            <div className="services-grid">
              {destacados.map(s => (
                <div key={s.id} className="service-preview-card">
                  <div className="service-preview-img-wrapper">
                    {s.imagen ? (
                      <img src={s.imagen} alt={s.nombre} className="service-preview-img" />
                    ) : (
                      <div className="service-preview-icon-alt">
                        <Sparkles size={40} />
                      </div>
                    )}
                  </div>

                  <h3>{s.nombre}</h3>

                  <p className="service-price">
                    Precio: ${s.precio.toLocaleString()}
                  </p>

                  <div className="service-meta">
                    <span className="service-meta-item">
                      <Clock size={16} /> {s.duracion} min
                    </span>
                    <span className="service-meta-item">
                      <DollarSign size={16} /> Seña: ${(s.precio / 2).toLocaleString()}
                    </span>
                  </div>

                  <p className="service-preview-desc">{s.descripcion}</p>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-4">
            <Link to="/servicios" className="btn btn-primary">
              Ver Todos los Servicios
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>¿Lista para tus nuevas uñas?</h2>
            <p>Pagás la seña ahora y el resto en el estudio</p>
            <Link to="/reservar" className="btn btn-primary btn-large">
              <Calendar size={24} />
              Reservar Mi Turno
            </Link>
          </div>
        </div>
      </section>

        {/* Ubicación Section */}
        <section className="ubicacion-section">
          <div className="container">
            <h2 className="section-title">Ubicación</h2>
            <p className="section-subtitle">¡Encontranos fácilmente en nuestro estudio!</p>
            <div className="map-responsive">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3282.803021234839!2d-58.44587668477044!3d-34.60908018045409!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bccb7e2b2e2e2b%3A0x2e2e2e2e2e2e2e2e!2sUbicacion%20Ejemplo!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
                width="100%"
                height="350"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa ubicación"
              ></iframe>
            </div>
          </div>
        </section>
    </div>
  );
};

export default Home;
