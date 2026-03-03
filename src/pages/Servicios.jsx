import { useState, useEffect } from 'react';
import { serviciosAPI } from '../services/api';
import { Sparkles, Clock, DollarSign } from 'lucide-react';
import './Servicios.css';

const Servicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    try {
      const response = await serviciosAPI.getAll();
      setServicios(response.data);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="spinner"></div>
        <p>Cargando servicios...</p>
      </div>
    );
  }

  return (
    <div className="servicios-page">
      <div className="servicios-header">
        <h1>Nuestros Servicios</h1>
        <p>Elegí el servicio perfecto para vos y reservá tu turno</p>
      </div>

      <div className="container">
        <div className="servicios-grid">
          {servicios.map((servicio) => (
            <div key={servicio.id} className="servicio-card servicio-card-home">
              <div className="service-preview-img-wrapper">
                {servicio.imagen ? (
                  <img
                    src={servicio.imagen}
                    alt={servicio.nombre}
                    className="service-preview-img"
                    style={{
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                      border: '2px solid #ffe3f2',
                      background: '#fff0fa',
                      objectFit: 'contain',
                      width: '100%',
                      height: '100%'
                    }}
                    onError={e => { e.target.onerror=null; e.target.src='https://via.placeholder.com/120x120?text=Sin+Imagen'; }}
                  />
                ) : (
                  <div className="service-preview-icon-alt"><Sparkles size={40} /></div>
                )}
              </div>
              <h3 className="service-card-title">{servicio.nombre}</h3>
              <p className="service-price">Precio: ${servicio.precio.toLocaleString()}</p>
              <div className="service-meta">
                <span className="service-meta-item"><Clock size={16} /> {servicio.duracion} min</span>
                <span className="service-meta-item"><DollarSign size={16} /> Seña: ${(servicio.precio/2).toLocaleString()}</span>
              </div>
              <p className="service-preview-desc">{servicio.descripcion}</p>
            </div>
          ))}
        </div>

        <div className="servicios-info">
          <div className="info-card">
            <h3>💳 Forma de Pago</h3>
            <p>
              Pagás solo el 50% de seña al reservar tu turno online mediante Mercado Pago.
              El resto se abona en el local al momento del servicio.
            </p>
          </div>
          <div className="info-card">
            <h3>📅 Cancelaciones</h3>
            <p>
              Podés cancelar tu turno con hasta 24 horas de anticipación para recibir 
              el reembolso de tu seña.
            </p>
          </div>
          <div className="info-card">
            <h3>⏰ Horarios</h3>
            <p>
              Lunes a Sábado de 9:00 a 19:00 hs. Domingos cerrado.
              Turnos cada hora según disponibilidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Servicios;
