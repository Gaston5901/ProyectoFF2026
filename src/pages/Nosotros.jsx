import './Nosotros.css';

const Nosotros = () => (
  <div className="nosotros-page">
    <div className="nosotros-header">
      <h1>Nosotros</h1>
      <p>Conocé nuestro local y equipo</p>
    </div>
    <div className="nosotros-content">
      <div className="nosotros-info">
        <h2>Delfina Nails Studio</h2>
        <p><strong>Dirección:</strong> Barrio San Martín mza A casa 5</p>
        <p><strong>Teléfono:</strong> 381-1234567</p>
        <p><strong>Instagram:</strong> @delfinanailsstudio</p>
        <p><strong>Especialidades:</strong> Esmaltado semipermanente, Soft Gel, Nail Art, Capping, Spa de manos y pies.</p>
      </div>
      <div className="nosotros-personas">
        <h2>Equipo</h2>
        <ul>
          <li><strong>Triny Zelarayan Sanna</strong> - Fundadora y Nail Artist</li>
          <li><strong>Delfina</strong> - Atención al cliente y reservas</li>
          <li><strong>Colaboradores</strong> - Spa y tratamientos</li>
        </ul>
      </div>
    </div>
  </div>
);

export default Nosotros;
