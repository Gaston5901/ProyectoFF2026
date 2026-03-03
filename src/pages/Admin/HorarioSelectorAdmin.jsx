import { useEffect, useState } from 'react';
import { horariosAPI } from '../../services/api';
import { Clock } from 'lucide-react';

const HorarioSelectorAdmin = ({ fecha, onSelect }) => {
  const [estadoHorarios, setEstadoHorarios] = useState({ todos: [], ocupados: [], disponibles: [] });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const estado = await horariosAPI.getEstadoDia(fecha);
      setEstadoHorarios(estado);
      setLoading(false);
    };
    cargar();
  }, [fecha]);
  return (
    <div>
      <h4>Seleccioná el horario</h4>
      {loading ? (
        <div className="no-horarios" style={{ alignItems: 'center' }}>
          <div className="spinner"></div>
          <p>Cargando horarios...</p>
        </div>
      ) : estadoHorarios.todos.length === 0 ? (
        <div className="no-horarios">
          <p>Este día no tiene horarios configurados.</p>
        </div>
      ) : (
        <>
          <div className="horarios-grid">
            {estadoHorarios.todos.map((hora) => {
              const ocupado = estadoHorarios.ocupados.includes(hora);
              return (
                <div
                  key={hora}
                  className={`hora-card ${ocupado ? 'ocupado' : ''}`}
                  style={{cursor: ocupado ? 'not-allowed' : 'pointer', opacity: ocupado ? 0.5 : 1}}
                  onClick={() => !ocupado && onSelect(hora)}
                >
                  <Clock size={20} /> {hora} hs {ocupado && <span className="tag-reservado">Reservado</span>}
                </div>
              );
            })}
          </div>
          {estadoHorarios.disponibles.length === 0 && (
            <div className="no-horarios">
              <p>Todos los horarios de este día están reservados.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HorarioSelectorAdmin;