import { useEffect, useState } from 'react';
import { horariosAPI } from '../../services/api';
import './EditarHorariosAdmin.css';

const diasSemana = [
  { key: '1', nombre: 'Lunes' },
  { key: '2', nombre: 'Martes' },
  { key: '3', nombre: 'Miércoles' },
  { key: '4', nombre: 'Jueves' },
  { key: '5', nombre: 'Viernes' },
  { key: '6', nombre: 'Sábado' },
];

const EditarHorariosAdmin = () => {
  const [horarios, setHorarios] = useState({});
  const [editando, setEditando] = useState(null);
  const [nuevoHorario, setNuevoHorario] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mensajeTipo, setMensajeTipo] = useState(''); // 'error' | 'success'
  const [errorModal, setErrorModal] = useState('');

  useEffect(() => {
    cargarHorarios();
  }, []);

  const cargarHorarios = async () => {
    setLoading(true);
    try {
      const resp = await horariosAPI.getPorDia();
      setHorarios(resp.data || {});
    } catch (e) {
      setMensaje('Error al cargar horarios');
      setMensajeTipo('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (dia) => {
    setEditando(dia);
    setNuevoHorario((horarios[dia] || []).join(', '));
    setMensaje('');
    setMensajeTipo('');
    setErrorModal('');
  };

  const validarHorarios = (valor) => {
    if (!valor.trim()) return '';
    const horariosArray = valor.split(',').map(h => h.trim()).filter(Boolean);
    const horariosDuplicados = horariosArray.filter((h, i, arr) => arr.indexOf(h) !== i);
    if (horariosDuplicados.length > 0) {
      const unicos = [...new Set(horariosDuplicados)];
      return `Horario repetido: ${unicos.join(', ')}. Ese horario ya está cargado.`;
    }
    const horariosInvalidos = horariosArray.filter(h => {
      const partes = h.split(':');
      if (partes.length !== 2) return true;
      const hh = Number(partes[0]);
      const mm = Number(partes[1]);
      return isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59;
    });
    if (horariosInvalidos.length > 0) {
      return `Horario inválido: ${horariosInvalidos.join(', ')}. Usá el formato HH:MM (ej: 08:00, 14:30)`;
    }
    return '';
  };

  const handleGuardar = async (dia) => {
    setLoading(true);
    try {
      const horariosArray = nuevoHorario.split(',').map(h => h.trim()).filter(Boolean);
      const error = validarHorarios(nuevoHorario);
      if (error) {
        setErrorModal(error);
        setMensaje('');
        setMensajeTipo('');
        setLoading(false);
        return;
      }

      // Limpiar horarios viejos en extras por fecha que coincidan con el horario anterior
      const nuevos = { ...horarios, [dia]: horariosArray };
      Object.keys(nuevos).forEach(key => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
          const day = new Date(key + 'T00:00:00').getDay();
          if (String(day) === dia) {
            // Eliminar horarios que estén en el array anterior del día (antes de editar)
            const anteriores = horarios[dia] || [];
            nuevos[key] = (nuevos[key] || []).filter(h => !anteriores.includes(h));
            // Si después de filtrar queda vacío, eliminar la clave
            if (nuevos[key].length === 0) delete nuevos[key];
          }
        }
      });

      await horariosAPI.setPorDia(nuevos);
      setHorarios(nuevos);
      setMensaje('Horario actualizado');
      setMensajeTipo('success');
      setEditando(null);
      setTimeout(() => { setMensaje(''); setMensajeTipo(''); }, 2500);
    } catch (e) {
      setMensaje('Error al guardar');
      setMensajeTipo('error');
      setTimeout(() => { setMensaje(''); setMensajeTipo(''); }, 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="editar-horarios-admin">
      <h2>Editar horarios por día</h2>
      {mensaje && (
        <div className={`mensaje-horario${mensajeTipo === 'error' ? ' mensaje-horario-error' : mensajeTipo === 'success' ? ' mensaje-horario-success' : ''}`}>
          {mensaje}
        </div>
      )}
      {loading && <div className="cargando-horario">Cargando...</div>}
      <div className="horarios-lista">
        {diasSemana.map(dia => (
          <div key={dia.key} className="horario-item">
            <div className="horario-info">
              <div className="horario-dia">{dia.nombre}</div>
              <div className="horario-valores">
                {(horarios[dia.key] || []).join(', ') || 'Sin horarios'}
              </div>
            </div>
            <button className="horario-btn" onClick={() => handleEditar(dia.key)}>
              Editar
            </button>
          </div>
        ))}
      </div>
      <p style={{marginTop:16, fontSize:'0.95em', color:'#666'}}>Los cambios aplican para todos los lunes, martes, etc. Si modificás un día, ese horario se usará para todos los de ese tipo.</p>

      {editando && (
        <div className="horario-modal-backdrop" onClick={() => setEditando(null)}>
          <div className="horario-modal" onClick={e => e.stopPropagation()}>
            <button className="horario-modal-close" onClick={() => setEditando(null)}>&times;</button>
            <h3>Editar horarios</h3>
            <p className="horario-modal-subtitle">
              {diasSemana.find(d => d.key === editando)?.nombre}
            </p>
            <label className="horario-modal-label">Horarios (separados por coma)</label>
            <input
              className="horario-modal-input"
              value={nuevoHorario}
              onChange={e => {
                const valor = e.target.value;
                setNuevoHorario(valor);
                setErrorModal(validarHorarios(valor));
              }}
              placeholder="Ej: 09:00, 10:00, 11:00"
            />
            {errorModal && (
              <div className="mensaje-horario mensaje-horario-error" style={{ marginTop: 8 }}>
                {errorModal}
              </div>
            )}
            <div className="horario-modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditando(null)} disabled={loading}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => handleGuardar(editando)} disabled={loading || !!errorModal}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditarHorariosAdmin;
