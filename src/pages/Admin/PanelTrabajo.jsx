// Componente para acciones de expirados con menú de tres puntos al lado del tilde
import Swal from 'sweetalert2';
function ExpiradoAcciones({ turno, onCompletar, onDevolverSenia }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const handleCompletar = async () => {
    const result = await Swal.fire({
      title: '¿Seguro que quieres completar solo la seña?',
      text: 'Esta acción marcará el turno como completado solo con la seña.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#38b000',
      cancelButtonColor: '#d13fa0',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    });
    if (result.isConfirmed) {
      onCompletar(turno);
    }
  };
  return (
    <div style={{position:'relative',display:'flex',alignItems:'center',gap:'6px'}}>
      <button className="btn-accion completar" onClick={handleCompletar} title="Completar solo seña">
        <CheckCircle size={20} />
      </button>
      <button
        className="btn-accion"
        style={{
          width:'32px',height:'32px',background:'none',color:'#ad1457',fontSize:'22px',border:'none',cursor:'pointer',padding:0,
          borderRadius:'50%',transition:'background 0.2s,color 0.2s'
        }}
        onClick={()=>setMenuOpen(v=>!v)}
        title="Más opciones"
        onMouseOver={e => {e.currentTarget.style.background='#ffe3f2';e.currentTarget.style.color='#d81b60';}}
        onMouseOut={e => {e.currentTarget.style.background='none';e.currentTarget.style.color='#ad1457';}}
      >
        <span style={{fontWeight:'bold'}}>⋮</span>
      </button>
      {menuOpen && (
        <div style={{position:'absolute',top:'38px',right:0,zIndex:10,background:'#fff',border:'1px solid #eee',borderRadius:'10px',boxShadow:'0 2px 8px rgba(0,0,0,0.10)',padding:'8px 16px',minWidth:'120px'}}>
          <button
            style={{
              background:'none',
              color:'#d81b60',
              fontWeight:'bold',
              border:'none',
              fontSize:'14px',
              cursor:'pointer',
              padding:'4px 0',
              borderRadius:'6px',
              width:'100%',
              transition:'background 0.2s, color 0.2s',
            }}
            onMouseOver={e => {e.currentTarget.style.background='#ffe3f2';e.currentTarget.style.color='#ad1457';}}
            onMouseOut={e => {e.currentTarget.style.background='none';e.currentTarget.style.color='#d81b60';}}
            onClick={()=>{onDevolverSenia(turno);setMenuOpen(false);}}
          >
            Devolver seña
          </button>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { turnosAPI, serviciosAPI, usuariosAPI } from '../../services/api';
import { CalendarDays, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'react-toastify';
import './Admin.css';

const PanelTrabajo = () => {
  const [loading, setLoading] = useState(true);
  const [turnosHoy, setTurnosHoy] = useState([]);
  const [turnosManana, setTurnosManana] = useState([]);
  const [turnosExpirados, setTurnosExpirados] = useState([]);
  const [servicios, setServicios] = useState({});
  const [usuarios, setUsuarios] = useState({});
  const [turnosCancelados, setTurnosCancelados] = useState([]);

  const hoyStr = format(new Date(), 'yyyy-MM-dd');
  const mananaStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const cargar = async () => {
    try {
      const [turnosRes, serviciosRes, usuariosRes] = await Promise.all([
        turnosAPI.getAll(),
        serviciosAPI.getAll(),
        usuariosAPI.getAll(),
      ]);
      const serviciosMap = {}; serviciosRes.data.forEach(s => serviciosMap[s.id] = s);
      const usuariosMap = {}; usuariosRes.data.forEach(u => usuariosMap[u.id] = u);
      setServicios(serviciosMap); setUsuarios(usuariosMap);

      const todos = turnosRes.data;
      setTurnosHoy(todos.filter(t => t.fecha === hoyStr && t.estado !== 'completado' && t.estado !== 'devuelto' && t.estado !== 'cancelado' && t.estado !== 'en_proceso').sort((a,b)=>a.hora.localeCompare(b.hora)));
      setTurnosManana(todos.filter(t => t.fecha === mananaStr && t.estado !== 'completado' && t.estado !== 'devuelto' && t.estado !== 'cancelado' && t.estado !== 'en_proceso').sort((a,b)=>a.hora.localeCompare(b.hora)));
      setTurnosExpirados(todos.filter(t => t.fecha < hoyStr && t.estado !== 'completado' && t.estado !== 'devuelto' && t.estado !== 'cancelado' && t.estado !== 'en_proceso').sort((a,b)=>a.fecha.localeCompare(b.fecha)));
      setTurnosCancelados(todos.filter(t => t.estado === 'cancelado' && t.estado !== 'en_proceso').sort((a,b)=>a.fecha.localeCompare(b.fecha)));
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  // Render para cancelados (fuera de cargar)
  function renderCancelados(lista) {
    return lista.length ? lista.map(t => {
      const s = servicios[t.servicioId];
      const u = usuarios[t.usuarioId];
      const nombreUsuario = u?.nombre || t.nombre || 'Sin nombre';
      const telefonoUsuario = u?.telefono || t.telefono || '';
      const precioTotal = t.montoTotal ?? s?.precio ?? '';
      return (
        <div key={t.id} className="turno-cancelado-item" style={{background:'#fff3f3',border:'1.5px solid #e57373',borderRadius:'12px',padding:'12px 18px',marginBottom:'10px'}}>
          <div>
            <div style={{fontWeight:'bold',color:'#e53935'}}>{t.hora} - {s?.nombre}</div>
            <div style={{fontSize:'1rem',color:'#ad1457'}}>{nombreUsuario}{telefonoUsuario ? ` / ${telefonoUsuario}` : ''}</div>
            <div className="turno-id" style={{fontSize:'0.9em',color:'#888'}}>ID: {t.pagoId}</div>
            <div className="turno-precio" style={{fontWeight:'bold',color:'#38b000',marginTop:'2px'}}>Total: ${precioTotal}</div>
          </div>
          <div className="turno-acciones" style={{display:'flex',gap:'8px'}}>
            <button
              className="btn-accion completar"
              onClick={async () => {
                const result = await Swal.fire({
                  title: '¿Seguro que quieres completar solo la seña?',
                  text: 'Esta acción marcará el turno como completado solo con la seña.',
                  icon: 'question',
                  showCancelButton: true,
                  confirmButtonColor: '#38b000',
                  cancelButtonColor: '#d13fa0',
                  confirmButtonText: 'Confirmar',
                  cancelButtonText: 'Cancelar',
                });
                if (result.isConfirmed) {
                  marcarCompletado(t);
                }
              }}
              title="Completar solo seña"
            >
              <CheckCircle size={20} /> Completar seña
            </button>
            <button
              className="btn-accion cancelar"
              onClick={async () => {
                const result = await Swal.fire({
                  title: '¿Seguro que quieres devolver la seña?',
                  text: 'Esta acción marcará la seña como devuelta y no se registrará en estadísticas.',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#d13fa0',
                  cancelButtonColor: '#888',
                  confirmButtonText: 'Confirmar',
                  cancelButtonText: 'Cancelar',
                });
                if (result.isConfirmed) {
                  devolverSenia(t);
                }
              }}
              title="Devolver seña"
            >
              Devolver seña
            </button>
          </div>
        </div>
      );
    }) : <p className="no-data">Sin turnos cancelados</p>;
  }

  useEffect(()=>{ cargar(); }, []);

  const marcarCompletado = async (turno) => {
    // Si expirado, solo seña; si normal, seña + resto
    let update = { estado: 'completado' };
    if (turno.fecha < hoyStr || turno.estado === 'cancelado') {
      update.registroEstadistica = 'seña';
    } else {
      update.registroEstadistica = 'total';
    }
    await turnosAPI.update(turno.id, update);
    toast.success('Turno marcado como completado');
    cargar();
  };

  const cancelarTurno = async (turno) => {
    await turnosAPI.update(turno.id, { estado: 'cancelado' });
    toast.info('Turno cancelado');
    cargar();
  };

  const devolverSenia = async (turno) => {
    await turnosAPI.update(turno.id, { estado: 'devuelto', registroEstadistica: 'ninguno', seniaDevuelta: true });
    toast.info('Seña devuelta, no se registra en estadísticas');
    cargar();
  };

  const puedeCancelar = (turno) => {
    const fechaTurno = new Date(turno.fecha + 'T' + turno.hora);
    const ahora = new Date();
    return (fechaTurno - ahora) / (1000*60*60) > 24 && turno.estado === 'confirmado';
  };

  const renderLista = (lista, tipo) => (
    lista.length ? lista.map(t => {
      const s = servicios[t.servicioId];
      const u = usuarios[t.usuarioId];
      const nombreUsuario = u?.nombre || t.nombre || 'Sin nombre';
      const telefonoUsuario = u?.telefono || t.telefono || '';
      const itemClass = tipo === 'expirados' ? 'turno-expirado-item' : 'turno-hoy-item';
      // Determinar el precio total a mostrar
      const precioTotal = t.montoTotal ?? s?.precio ?? '';
      return (
        <div key={t.id} className={itemClass}>
          <div className="turno-hora">{t.hora ? t.hora : ''}</div>
          <div className="turno-detalles">
            <h4>{s?.nombre}</h4>
            <p>{nombreUsuario}{telefonoUsuario ? ` / ${telefonoUsuario}` : ''}</p>
            <p className="turno-id">ID: {t.pagoId}</p>
            <p className="turno-precio" style={{fontWeight:'bold',color:'#38b000',marginTop:'2px'}}>Total: ${precioTotal}</p>
          </div>
          <div className="turno-acciones" style={{display:'flex',gap:'8px'}}>
            {(tipo === 'hoy' || tipo === 'manana') && (
              <button
                className="btn-accion completar"
                onClick={async () => {
                  const result = await Swal.fire({
                    title: '¿Seguro que quieres completar el turno?',
                    text: 'Esta acción marcará el turno como completado.',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#38b000',
                    cancelButtonColor: '#d13fa0',
                    confirmButtonText: 'Confirmar',
                    cancelButtonText: 'Cancelar',
                  });
                  if (result.isConfirmed) {
                    marcarCompletado(t);
                  }
                }}
                title="Completar"
              >
                <CheckCircle size={20} />
              </button>
            )}
            {puedeCancelar(t) && (
              <button className="btn-accion cancelar" onClick={()=>cancelarTurno(t)} title="Cancelar">
                Cancelar
              </button>
            )}
            {tipo === 'expirados' && (
              <ExpiradoAcciones turno={t} onCompletar={marcarCompletado} onDevolverSenia={devolverSenia} />
            )}
          </div>
        </div>
      );
    }) : <p className="no-data">Sin turnos</p>
  );

  if (loading) return <div className="container" style={{textAlign:'center',padding:'80px'}}><div className="spinner"></div><p>Cargando panel de trabajo...</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><CalendarDays size={40}/> Panel de Trabajo</h1>
        <p>Gestiona los turnos de hoy, mañana y expirados</p>
      </div>
      <div className="container">
        <div className="admin-sections">
          <div className="admin-section">
            <h2>Hoy ({format(new Date(), 'dd/MM')})</h2>
            {renderLista(turnosHoy, 'hoy')}
          </div>
          <div className="admin-section">
            <h2>Mañana ({format(addDays(new Date(),1), 'dd/MM')})</h2>
            {renderLista(turnosManana, 'manana')}
          </div>
          <div className="admin-section">
            <h2><AlertTriangle size={18}/> Expirados</h2>
            {renderLista(turnosExpirados, 'expirados')}
          </div>
          <div className="admin-section">
            <h2 style={{color:'#e53935'}}>Cancelados</h2>
            {renderCancelados(turnosCancelados)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelTrabajo;
