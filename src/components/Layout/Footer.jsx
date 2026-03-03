import { Link } from 'react-router-dom';
import { Instagram, Facebook, Phone, Mail, MapPin } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">Delfina Nails Studio</h3>
          <p className="footer-text">
            Especialistas en esmaltado semipermanente, Soft Gel y diseños a mano alzada.
            Cuidamos cada detalle para que tus manos y pies luzcan perfectos.
          </p>
          {/* <div className="footer-social">
             <a href="https://www.instagram.com/nailsstudio_delfina" target="_blank" rel="noopener" className="social-link">
                <Instagram size={24} />
                <span style={{ display: 'block', fontSize: '13px', marginTop: '2px', color: '#fff' }}>nailsstudio_delfina</span>
            </a> 
             <a href="#" className="social-link" title="Facebook (próximamente)">
              <Facebook size={24} />
            </a> 
          </div> */}
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Enlaces</h3>
          <ul className="footer-links">
            <li><Link to="/" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Inicio</Link></li>
            <li><Link to="/servicios" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Servicios</Link></li>
            <li><Link to="/reservar" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Reservar Turno</Link></li>
            <li><Link to="/mis-turnos" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Mis Turnos</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Contacto</h3>
          <ul className="footer-contact">
            <li>
              <Phone size={18} />
              <span>3816472708</span>
            </li>
            <li>
              <Mail size={18} />
              <span>delfinanailsstudio@gmail.com</span>
            </li>
            <li>
              <MapPin size={18} />
              <span>Barrio Los Olivos mza A casa 3   </span>
            </li>
            <li>
              <Instagram size={18} />
              <span>nailsstudio_delfina</span>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Horarios</h3>
          <p className="footer-text">Lunes: 08:00 - 17:30</p>
          <p className="footer-text">Martes: 08:00 - 20:00</p>
          <p className="footer-text">Miércoles: 08:00 - 17:30</p>
          <p className="footer-text">Jueves: 08:00 - 20:00</p>
          <p className="footer-text">Viernes: 08:00 - 17:30</p>
          <p className="footer-text">Sábado: 08:00 - 20:00</p>
          <p className="footer-text" style={{ marginTop: '6px' }}>Domingo: Cerrado</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 Delfina Nails Studio. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
