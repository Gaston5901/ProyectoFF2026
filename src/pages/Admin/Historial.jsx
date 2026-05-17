import { useState, useEffect, useRef } from 'react';
import { turnosAPI, serviciosAPI } from '../../services/api';
import { History, Search, Eye, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import './Admin.css';

const formatEstadoLabel = (value) => String(value || '').split('_').join(' ').toUpperCase();
const HISTORIAL_ESTADOS = [
  'ultimos_5',
  'todos',
  'en_proceso',
  'confirmado',
  'completado',
  'cancelado',
  'rechazado',
  'expirado',
  'devuelto',
];

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

    estadoLabel = formatEstadoLabel(estadoLabel);
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

          <div><b>ID pago:</b> <span style={{ color: '#d13fa0', fontWeight: 600 }}>{turno.pagoId || turno.id}</span></div>

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
  const [filtroEstado, setFiltroEstado] = useState('ultimos_5');
  const [modalTurnoId, setModalTurnoId] = useState(null);
  const [pagina, setPagina] = useState(1);
  const itemsPorPagina = 6;
  const topRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (modalTurnoId) {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      document.body.dataset.modalScrollY = String(scrollY);
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        const savedY = Number(document.body.dataset.modalScrollY || '0');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        delete document.body.dataset.modalScrollY;
        window.scrollTo(0, savedY);
      };
    }
  }, [modalTurnoId]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const limit = filtroEstado === 'ultimos_5' ? 5 : undefined;
      const [t, s] = await Promise.all([
        turnosAPI.getAll(limit ? { limit } : undefined),
        serviciosAPI.getAll(),
      ]);

      const sMap = {};
      s.data.forEach(x => sMap[x.id] = x);

      setServicios(sMap);
      setUsuarios({});
      setTurnos(t.data.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const turnosFuente = filtroEstado === 'ultimos_5' ? turnos.slice(0, 5) : turnos;

  const turnosFiltrados = turnosFuente.filter(t => {
    const estadoOk = filtroEstado === 'todos' || filtroEstado === 'ultimos_5' || t.estado === filtroEstado;
    const b = busqueda.toLowerCase();
    const pagoIdStr = String(t.pagoId || t.id || '').toLowerCase();
    const buscaOk =
      !b ||
      servicios[t.servicioId]?.nombre.toLowerCase().includes(b) ||
      (usuarios[t.usuarioId]?.nombre || t.nombre || '').toLowerCase().includes(b) ||
      pagoIdStr.includes(b);
    return estadoOk && buscaOk;
  });

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(turnosFiltrados.length / itemsPorPagina));
  const turnosPaginados = turnosFiltrados.slice(
    (pagina - 1) * itemsPorPagina,
    pagina * itemsPorPagina
  );

  const start = (pagina - 1) * itemsPorPagina;
  const end = start + itemsPorPagina;
  const mostrandoDesde = turnosFiltrados.length === 0 ? 0 : start + 1;
  const mostrandoHasta = Math.min(end, turnosFiltrados.length);

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
            <div className="filtros filtros-compact" aria-label="Filtro de estado">
              <span className="filtros-icon" aria-hidden="true">
                <Filter size={16} />
              </span>
              <select
                className="filtro-select"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                aria-label="Filtrar por estado"
              >
                {HISTORIAL_ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado === 'ultimos_5' ? 'ÚLTIMOS 5' : formatEstadoLabel(estado)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="historial-table-frame">
          <div className="turnos-list-header">
            <div className="turnos-summary">
              Mostrando {mostrandoDesde}-{mostrandoHasta} de {turnosFiltrados.length}
            </div>

            {turnosFiltrados.length > itemsPorPagina && (
              <div className="turnos-pager turnos-pager-slim" aria-label="Paginación historial">
                <button
                  type="button"
                  className="turnos-page-btn"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="turnos-page-indicator">
                  {pagina}/{totalPaginas}
                </span>
                <button
                  type="button"
                  className="turnos-page-btn"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="turnos-table historial-table" role="table" aria-label="Historial de turnos">
          <div className="turnos-row turnos-row-header" role="row">
            <div className="turnos-cell cell-servicio" role="columnheader">
              <span className="turnos-num turnos-num-header">N°</span>
              <span>Servicio</span>
            </div>
            <div className="turnos-cell cell-cliente" role="columnheader">Cliente</div>
            <div className="turnos-cell cell-fechaHora" role="columnheader">Fecha y hora</div>
            <div className="turnos-cell cell-estado" role="columnheader">Estado</div>
            <div className="turnos-cell cell-opciones" role="columnheader">Ver</div>
          </div>

          {turnosPaginados.map((turno, idx) => {
            const servicio = servicios[turno.servicioId];
            const usuario = usuarios[turno.usuarioId];
            const nombreUsuario = usuario?.nombre || turno.nombre || 'Sin nombre';

            const rowNum = turnosFiltrados.length - (start + idx);

            let estadoLabel = turno.estado;
            let estadoColor = '#1e7e34';
            const fechaTurno = new Date(turno.fecha + 'T' + (turno.hora || '00:00') + ':00');
            const ahora = new Date();
            if (turno.estado === 'rechazado') {
              estadoLabel = 'rechazado';
              estadoColor = '#a020f0';
            } else if (turno.estado === 'devuelto' && turno.seniaDevuelta) {
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
            } else if (turno.estado === 'completado' && turno.registroEstadistica === 'seña' && fechaTurno < ahora) {
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

            estadoLabel = formatEstadoLabel(estadoLabel);

            return (
              <div key={turno.id} className="turnos-row" role="row">
                <div className="turnos-cell cell-servicio" role="cell">
                  <span className="turnos-num">{rowNum}</span>
                  <span className="turnos-servicio-nombre">{servicio?.nombre || 'Servicio'}</span>
                </div>

                <div className="turnos-cell cell-cliente" role="cell">
                  <span className="turnos-cliente-nombre">{nombreUsuario}</span>
                </div>

                <div className="turnos-cell cell-fechaHora" role="cell">
                  {format(new Date(turno.fecha + 'T00:00:00'), 'dd/MM/yyyy')} · {turno.hora} hs
                </div>

                <div className="turnos-cell cell-estado" role="cell">
                  <span
                    className="turnos-estado-badge"
                    style={{
                      color: estadoColor,
                      border: `1px solid ${estadoColor}33`,
                    }}
                  >
                    {estadoLabel}
                  </span>
                </div>

                <div className="turnos-cell cell-opciones" role="cell">
                  <button
                    className="turnos-editar-btn"
                    onClick={() => setModalTurnoId(turno.id)}
                    title="Ver detalles"
                    aria-label="Ver detalles"
                    type="button"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>

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
