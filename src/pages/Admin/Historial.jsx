import { useState, useEffect, useRef } from 'react';
import { turnosAPI, serviciosAPI, usuariosAPI } from '../../services/api';
import { History, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import './Admin.css';

/* =====================================================
   MODAL TURNO DETALLE — PREMIUM
===================================================== */
function ModalTurnoDetalle({ turno, usuario, servicio, onClose }) {
    // Mensaje informativo sobre el dinero y badge mejorado
    let infoDinero = '';
    let estadoLabel = turno.estado;
    let estadoColor = '#1e7e34';
    // Badge simple para estado principal
    // Si el estado es 'completado' pero registroEstadistica es 'seña' y la fecha ya pasó, mostrar como 'expirado'
    const fechaTurno = new Date(turno.fecha + 'T' + (turno.hora || '00:00') + ':00');
    const ahora = new Date();
    if (turno.estado === 'rechazado') {
      estadoLabel = 'rechazado';
      estadoColor = '#a020f0'; // violeta
      infoDinero = 'Este turno fue rechazado por el administrador. El cliente puede reservar nuevamente este horario.';
    } else if (turno.estado === 'devuelto' && turno.seniaDevuelta) {
      // Si es seña devuelta, registroEstadistica es 'seña' o 'ninguno' y la fecha ya pasó, es expirado
      if ((turno.registroEstadistica === 'seña' || turno.registroEstadistica === 'ninguno') && fechaTurno < ahora) {
        estadoLabel = 'expirado';
        estadoColor = '#ff9800';
        infoDinero = 'La seña fue devuelta al cliente, no se recibió dinero.';
      } else if (turno.registroEstadistica === 'seña' || turno.registroEstadistica === 'ninguno') {
        estadoLabel = 'cancelado';
        estadoColor = '#e53935';
        infoDinero = 'La seña fue devuelta al cliente, no se recibió dinero.';
      } else if (turno.registroEstadistica === 'expirado') {
        estadoLabel = 'expirado';
        estadoColor = '#ff9800';
        infoDinero = 'La seña fue devuelta al cliente, no se recibió dinero.';
      } else {
        estadoLabel = 'devuelto';
        estadoColor = '#856404';
        infoDinero = 'La seña fue devuelta al cliente.';
      }
    } else if (
      turno.estado === 'completado' &&
      turno.registroEstadistica === 'seña' &&
      fechaTurno < ahora
    ) {
      estadoLabel = 'expirado';
      estadoColor = '#ff9800';
      infoDinero = 'Solo se recibió la seña, el cliente no asistió.';
    } else if (turno.estado === 'completado' && turno.registroEstadistica === 'seña') {
      estadoLabel = 'cancelado';
      estadoColor = '#e53935';
      infoDinero = 'Solo se recibió la seña, el cliente no completó el pago.';
    } else if (turno.estado === 'cancelado') {
      estadoLabel = 'cancelado';
      estadoColor = '#e53935';
    } else if (turno.estado === 'expirado' && turno.registroEstadistica === 'seña') {
      estadoLabel = 'expirado';
      estadoColor = '#ff9800';
      infoDinero = 'Solo se recibió la seña, el cliente no asistió.';
    } else if (turno.estado === 'expirado') {
      estadoLabel = 'expirado';
      estadoColor = '#ff9800';
    } else if (turno.estado === 'completado') {
      estadoLabel = 'completado';
      estadoColor = '#388e3c';
      infoDinero = 'El cliente pagó el total del servicio.';
    } else if (turno.estado === 'confirmado') {
      estadoLabel = 'confirmado';
      estadoColor = '#1976d2';
      infoDinero = 'Turno pendiente de pago final.';
    }
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => (document.body.style.overflow = '');
  }, []);

  const cerrarOverlay = (e) => {
    if (e.target.classList.contains('modal-turno-overlay')) {
      onClose();
    }
  };


  return (
    <>
      <style>{`
        @keyframes modalFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalPop {
          0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0 }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1 }
        }
      `}</style>

      <div
        className="modal-turno-overlay"
        onClick={cerrarOverlay}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,10,20,0.6)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          animation: 'modalFadeIn .25s'
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(14px)',
          borderRadius: 26,
          padding: '36px 34px',
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 28px 70px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.45)',
          zIndex: 1001,
          animation: 'modalPop .35s cubic-bezier(.22,1,.36,1)'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 18,
            fontSize: 30,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#d13fa0',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 34 }}>📋</span>
          <h2 style={{ margin: 0, color: '#d13fa0' }}>{servicio?.nombre}</h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <span style={{ fontSize:13, fontWeight:600, color: estadoColor, background:'#fff', borderRadius:12, padding:'4px 14px', display:'inline-block', border:`1px solid ${estadoColor}33`}}>
            {estadoLabel}
          </span>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.9, color: '#333' }}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:2}}>
            <b>Cliente:</b> {usuario?.nombre} <span style={{ color: '#888' }}>({usuario?.telefono})</span>
          </div>
          <div><b>Fecha:</b> {format(new Date(turno.fecha + 'T00:00:00'), 'dd/MM/yyyy')} · <b>Hora:</b> {turno.hora} hs</div>

          <hr style={{ border: 'none', height: 1, background: 'linear-gradient(to right, transparent, #d13fa0, transparent)', margin: '14px 0' }} />

          <div><b>Total:</b> <span style={{ color: '#388e3c' }}>${turno.montoTotal.toLocaleString()}</span></div>
          <div><b>Pagado:</b> <span style={{ color: '#1976d2' }}>${turno.montoPagado.toLocaleString()}</span></div>

          <div><b>Resta:</b> <span style={{ color: '#ff9800' }}>${(turno.montoTotal - turno.montoPagado).toLocaleString()}</span></div>
          {infoDinero && (
            <div style={{margin:'6px 0 0 0',fontSize:14,color:'#a020f0',fontWeight:500}}>{infoDinero}</div>
          )}

          <hr style={{ border: 'none', height: 1, background: 'linear-gradient(to right, transparent, #d13fa0, transparent)', margin: '14px 0' }} />

          <div><b>ID de pago:</b> <span style={{ color: '#d13fa0', fontWeight: 600 }}>{turno.pagoId}</span></div>

          <div style={{ fontSize: 13, color: '#999', marginTop: 10 }}>
            Creado: {format(new Date(turno.createdAt), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      </div>
    </>
  );
}

/* =====================================================
   HISTORIAL — CARDS PREMIUM
===================================================== */
const Historial = () => {
  const [turnos, setTurnos] = useState([]);
  const [servicios, setServicios] = useState({});
  const [usuarios, setUsuarios] = useState({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modalTurnoId, setModalTurnoId] = useState(null);
  const [pagina, setPagina] = useState(1);
  const itemsPorPagina = 8;
  const topRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const cargarDatos = async () => {
    try {
      const [t, s, u] = await Promise.all([
        turnosAPI.getAll(),
        serviciosAPI.getAll(),
        usuariosAPI.getAll(),
      ]);

      const sMap = {};
      s.data.forEach(x => sMap[x.id] = x);

      const uMap = {};
      u.data.forEach(x => uMap[x.id] = x);

      setServicios(sMap);
      setUsuarios(uMap);
      setTurnos(t.data.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const turnosFiltrados = turnos.filter(t => {
    const estadoOk = filtroEstado === 'todos' || t.estado === filtroEstado;
    const b = busqueda.toLowerCase();
    const buscaOk =
      !b ||
      servicios[t.servicioId]?.nombre.toLowerCase().includes(b) ||
      (usuarios[t.usuarioId]?.nombre || t.nombre || '').toLowerCase().includes(b) ||
      t.pagoId.toLowerCase().includes(b);
    return estadoOk && buscaOk;
  });

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroEstado]);

  useEffect(() => {
    if (!loading) {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [pagina, loading]);

  const totalPaginas = Math.max(1, Math.ceil(turnosFiltrados.length / itemsPorPagina));
  const turnosPaginados = turnosFiltrados.slice(
    (pagina - 1) * itemsPorPagina,
    pagina * itemsPorPagina
  );

  if (loading) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="admin-page historial-page" ref={topRef}>
      <div className="admin-header">
        <h1 className="historial-title"><History size={40} /> Historial de Turnos</h1>
        <p>Todos los turnos registrados en el sistema</p>
        {turnosFiltrados.length > itemsPorPagina && (
          <div
            style={{
              marginTop: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(209,63,160,0.08)',
              border: '1px solid rgba(209,63,160,0.2)',
              color: '#d13fa0',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            Página {pagina} de {totalPaginas}
          </div>
        )}
      </div>

      <div className="container">
        <div className="turnos-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              placeholder="Buscar por servicio, cliente o pago..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          <div className="filtros">
            {['todos','confirmado','completado'].map(f => (
              <button
                key={f}
                className={`filtro-btn ${filtroEstado === f ? 'active' : ''}`}
                onClick={() => setFiltroEstado(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="historial-lista">
        {turnosPaginados.map(turno => {
          const servicio = servicios[turno.servicioId];
          const usuario = usuarios[turno.usuarioId];
          const nombreUsuario = usuario?.nombre || turno.nombre || 'Sin nombre';
          // Badge simple para estado principal
          let estadoLabel = turno.estado;
          let estadoColor = '#1e7e34';
          let infoDinero = '';
          const fechaTurno = new Date(turno.fecha + 'T' + (turno.hora || '00:00') + ':00');
          const ahora = new Date();
          if (turno.estado === 'rechazado') {
            estadoLabel = 'rechazado';
            estadoColor = '#a020f0'; // violeta
            infoDinero = 'Este turno fue rechazado por el administrador. El cliente puede reservar nuevamente este horario.';
          } else if (turno.estado === 'devuelto' && turno.seniaDevuelta) {
            // Si es seña devuelta, registroEstadistica es 'seña' o 'ninguno' y la fecha ya pasó, es expirado
            if ((turno.registroEstadistica === 'seña' || turno.registroEstadistica === 'ninguno') && fechaTurno < ahora) {
              estadoLabel = 'expirado';
              estadoColor = '#ff9800';
            } else if (turno.registroEstadistica === 'seña' || turno.registroEstadistica === 'ninguno') {
              estadoLabel = 'cancelado';
              estadoColor = '#e53935';
            } else if (turno.registroEstadistica === 'expirado') {
              estadoLabel = 'expirado';
              estadoColor = '#ff9800';
            } else {
              estadoLabel = 'devuelto';
              estadoColor = '#856404';
            }
          } else if (
            turno.estado === 'completado' &&
            turno.registroEstadistica === 'seña' &&
            fechaTurno < ahora
          ) {
            estadoLabel = 'expirado';
            estadoColor = '#ff9800';
          } else if (turno.estado === 'completado' && turno.registroEstadistica === 'seña') {
            estadoLabel = 'cancelado';
            estadoColor = '#e53935';
          } else if (turno.estado === 'cancelado') {
            estadoLabel = 'cancelado';
            estadoColor = '#e53935';
          } else if (turno.estado === 'expirado' && turno.registroEstadistica === 'seña') {
            estadoLabel = 'expirado';
            estadoColor = '#ff9800';
          } else if (turno.estado === 'expirado') {
            estadoLabel = 'expirado';
            estadoColor = '#ff9800';
          } else if (turno.estado === 'completado') {
            estadoLabel = 'completado';
            estadoColor = '#388e3c';
          } else if (turno.estado === 'confirmado') {
            estadoLabel = 'confirmado';
            estadoColor = '#1976d2';
          }
          return (
            <div key={turno.id} className="historial-item">
              <div className="historial-info">
                <div className="historial-titulo">{servicio?.nombre}</div>
                <div className="historial-linea">
                  <span className="historial-cliente">{nombreUsuario}</span>
                  <span className="historial-estado" style={{ color: estadoColor, borderColor: `${estadoColor}33` }}>
                    {estadoLabel}
                  </span>
                </div>
                <div className="historial-fecha">
                  {format(new Date(turno.fecha+'T00:00:00'),'dd/MM/yyyy')} · {turno.hora} hs
                </div>
              </div>
              <button className="historial-ver" onClick={() => setModalTurnoId(turno.id)} title="Ver detalles">
                <Eye size={18} />
              </button>
            </div>
          );
        })}
        </div>

        {turnosFiltrados.length > itemsPorPagina && (
          <div className="historial-paginacion">
            <button
              className="btn btn-secondary"
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >
              Anterior
            </button>
            <span className="historial-pagina">Página {pagina} de {totalPaginas}</span>
            <button
              className="btn btn-secondary"
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
            >
              Siguiente
            </button>
          </div>
        )}

        {/* ModalTurnoDetalle fuera del map, estable y sin parpadeo */}
        {modalTurnoId && (() => {
          const turnoSel = turnos.find(t => t.id === modalTurnoId);
          if (!turnoSel) return null;
          const servicioSel = servicios[turnoSel.servicioId];
          const usuarioSel = usuarios[turnoSel.usuarioId];
          const usuarioModal = {
            ...usuarioSel,
            nombre: usuarioSel?.nombre || turnoSel.nombre || 'Sin nombre',
            telefono: usuarioSel?.telefono || turnoSel.telefono || '',
          };
          return (
            <ModalTurnoDetalle
              turno={turnoSel}
              usuario={usuarioModal}
              servicio={servicioSel}
              onClose={() => setModalTurnoId(null)}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default Historial;
