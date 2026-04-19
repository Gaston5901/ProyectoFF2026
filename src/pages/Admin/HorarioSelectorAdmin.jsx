import { useEffect, useState } from 'react';
import { horariosAPI } from '../../services/api';
import { Clock } from 'lucide-react';

const HorarioSelectorAdmin = ({
  fecha,
  onSelect,
  ignoreTurnoId,
  selectedHora,
  blockedHoras = [],
}) => {
  const [estadoHorarios, setEstadoHorarios] = useState({ todos: [], ocupados: [], disponibles: [] });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const estado = await horariosAPI.getEstadoDia(fecha, ignoreTurnoId ? { ignoreTurnoId } : undefined);
      setEstadoHorarios(estado);
      setLoading(false);
    };
    cargar();
  }, [fecha, ignoreTurnoId]);
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
              const bloqueado = Array.isArray(blockedHoras) && blockedHoras.includes(hora);
              const ocupado = estadoHorarios.ocupados.includes(hora) || bloqueado;
              const seleccionado = Boolean(selectedHora) && selectedHora === hora;
              return (
                <div
                  key={hora}
                  className={`hora-card ${ocupado ? 'ocupado' : ''} ${seleccionado ? 'selected' : ''}`}
                  style={{cursor: ocupado ? 'not-allowed' : 'pointer', opacity: ocupado ? 0.5 : 1}}
                  onClick={() => !ocupado && onSelect(hora)}
                >
                  <Clock size={20} /> {hora} hs
                  {ocupado && (
                    <span className="tag-reservado">{bloqueado ? 'Tu turno' : 'Reservado'}</span>
                  )}
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