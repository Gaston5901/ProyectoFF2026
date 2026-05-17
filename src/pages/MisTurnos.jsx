import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { turnosAPI, serviciosAPI } from '../services/api';
import { Calendar, CheckCircle, ChevronLeft, ChevronRight, Clock, Eye, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import './MisTurnos.css';

const ITEMS_POR_PAGINA = 8;

const getTurnoId = (turno) => turno?.id || turno?._id;

const parseTurnoDateTime = (turno) => {
  const fechaStr = String(turno?.fecha || '').trim();
  if (!fechaStr) return null;
  const horaStr = String(turno?.hora || '00:00').trim();
  const dt = new Date(`${fechaStr}T${horaStr}:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
};

const getEstadoBadgeInfo = (turno) => {
  let badge = '';
  let badgeClass = 'turno-badge';

  if (turno?.estado === 'cancelado') {
    badge = 'CANCELADO';
    badgeClass += ' cancelado';
  } else if (turno?.estadoTransferencia === 'rechazado' || turno?.estado === 'rechazado') {
    badge = 'RECHAZADO';
    badgeClass += ' rechazado-violeta';
  } else {
    switch (turno?.estado) {
      case 'en_proceso':
        badge = 'EN PROCESO';
        badgeClass += ' en-proceso';
        break;
      case 'devuelto':
        badge = 'DEVUELTO';
        badgeClass += ' devuelto';
        break;
      case 'confirmado':
        badge = 'CONFIRMADO';
        badgeClass += ' confirmado';
        break;
      case 'expirado':
        badge = 'EXPIRADO';
        badgeClass += ' expirado';
        break;
      case 'completado':
        badge = 'CONFIRMADO';
        badgeClass += ' confirmado';
        break;
      default:
        badge = 'COMPLETADO';
        badgeClass += ' completado';
        break;
    }
  }

  return { badge, badgeClass };
};

// Banner serpiente animado fino y colorido debajo del título
function SnakeBanner({ show }) {
  if (!show) return null;
  // Mensaje a animar
  const mensaje = (
    <>
      <span
        role="img"
        aria-label="serpiente"
        style={{
          fontSize: '1.5em',
          verticalAlign: 'middle',
          position: 'relative',
          top: '-0.18em'
        }}
      >
        𝕯ɴ.
      </span>{' '}
      Verificá tu correo para ver la confirmación del turno. Si tu turno está "en proceso", recargá la página más tarde: puede ser confirmado o rechazado en cualquier momento.
      <span role="img" aria-label="serpiente"></span>
    </>
  );
  return (
    <div
      style={{
        width: '100vw',
        margin: '0 auto',
        marginBottom: 16,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 0,
        maxWidth: '100vw',
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(90deg,#fce4ec 0%,#f8bbd0 50%,#fce4ec 100%)',
          color: '#e91e63',
          fontWeight: 600,
          fontSize: 'clamp(13px,2.2vw,16px)',
          padding: '6px 0',
          borderRadius: 12,
          boxShadow: '0 2px 8px #e91e6322',
          width: '98vw',
          maxWidth: '1100px',
          minHeight: 0,
          position: 'relative',
          border: '1.5px solid #f8bbd0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              whiteSpace: 'nowrap',
              alignItems: 'center',
              width: 'max-content',
              animation: 'snake-banner-move 22s linear infinite',
            }}
          >
            <span style={{ display: 'inline-block', paddingRight: 80 }}>{mensaje}</span>
            <span style={{ display: 'inline-block', paddingRight: 80 }}>{mensaje}</span>
          </div>
        </div>
        <style>{`
          @keyframes snake-banner-move {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    </div>
  );
}

function ModalTurnoDetalle({ turno, servicio, onClose, onCancelar, puedeCancelar }) {
  const fechaFormateada = (() => {
    try {
      return format(new Date(`${turno.fecha}T00:00:00`), 'dd/MM/yyyy', { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  })();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const cerrarOverlay = (e) => {
    if (e.target.classList.contains('modal-turno-overlay')) {
      onClose();
    }
  };

  const montoTotal = Number(turno?.montoTotal ?? 0);
  const montoPagado = Number(turno?.montoPagado ?? 0);
  const resta = Number.isFinite(montoTotal - montoPagado) ? montoTotal - montoPagado : 0;

  const { badge, badgeClass } = getEstadoBadgeInfo(turno);

  return (
    <>
      <style>{`
        @keyframes modalFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalPop {
          0% { transform: translate(-50%, -50%) scale(0.94); opacity: 0 }
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
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(14px)',
          borderRadius: 22,
          padding: '26px 22px',
          width: '100%',
          maxWidth: 460,
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
            top: 12,
            right: 14,
            fontSize: 28,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#d13fa0',
            fontWeight: 'bold'
          }}
          aria-label="Cerrar"
          type="button"
        >
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 28 }}>📋</span>
          <h2 style={{ margin: 0, color: '#d13fa0', fontSize: 20 }}>
            {servicio?.nombre || turno?.servicioNombre || turno?.servicio_nombre || 'Servicio'}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#333' }}>
          <Calendar size={18} />
          <b>{fechaFormateada}</b>
          <span style={{ opacity: 0.6 }}>·</span>
          <Clock size={18} />
          <b>{turno?.hora ? `${turno.hora} hs` : '-'}</b>
        </div>

        <div style={{ marginTop: 12, fontSize: 15, lineHeight: 1.8, color: '#333' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b>Estado:</b>
            <span
              className={badgeClass}
              style={{
                position: 'static',
                top: 'auto',
                right: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 10px',
                borderRadius: 999,
                boxShadow: 'none',
                fontSize: 11,
                letterSpacing: '0.3px',
              }}
            >
              {badge || String(turno?.estado || '-').split('_').join(' ').toUpperCase()}
            </span>
          </div>

          <hr style={{ border: 'none', height: 1, background: 'linear-gradient(to right, transparent, #d13fa0, transparent)', margin: '14px 0' }} />

          <div><b>Total:</b> <span style={{ color: '#388e3c', fontWeight: 900 }}>${Number.isFinite(montoTotal) ? montoTotal.toLocaleString() : '-'}</span></div>
          <div><b>Seña pagada:</b> <span style={{ color: '#1976d2', fontWeight: 900 }}>${Number.isFinite(montoPagado) ? montoPagado.toLocaleString() : '-'}</span></div>
          <div><b>Resta:</b> <span style={{ color: '#ff9800', fontWeight: 900 }}>${Number.isFinite(resta) ? resta.toLocaleString() : '-'}</span></div>

          {turno?.pagoId && (
            <>
              <hr style={{ border: 'none', height: 1, background: 'linear-gradient(to right, transparent, #d13fa0, transparent)', margin: '14px 0' }} />
              <div><b>ID pago:</b> <span style={{ color: '#d13fa0', fontWeight: 800 }}>{turno.pagoId}</span></div>
            </>
          )}

          {puedeCancelar && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                className="btn btn-danger"
                style={{ padding: '8px 16px', borderRadius: 10, background: '#e53935', color: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                type="button"
                onClick={() => onCancelar(turno)}
              >
                Cancelar turno
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Quitar scroll lateral de la página
if (typeof window !== 'undefined') {
  document.documentElement.style.overflowX = 'hidden';
  document.body.style.overflowX = 'hidden';
}

const MisTurnos = () => {
    // Scroll automático al top al entrar a la página
    useEffect(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, []);
  const { user } = useAuth();
  const [turnos, setTurnos] = useState([]);
  const [servicios, setServicios] = useState({});
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modalTurnoId, setModalTurnoId] = useState(null);
  const topRef = useRef(null);

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;
    async function cargarDatos() {
      setLoading(true);
      try {
        const turnosRes = await turnosAPI.getByUsuario(userId);
        if (!cancelado) setTurnos(turnosRes || []);
      } catch (err) {
        if (!cancelado) setTurnos([]);
      }
      try {
        const serviciosRes = await serviciosAPI.getAll();
        const serviciosObj = {};
        (serviciosRes?.data || serviciosRes || []).forEach(s => {
          if (s?.id) serviciosObj[s.id] = s;
          if (s?._id) serviciosObj[s._id] = s;
        });
        if (!cancelado) setServicios(serviciosObj);
      } catch (err) {
        if (!cancelado) setServicios({});
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    cargarDatos();
    return () => { cancelado = true; };
  }, [userId]);

  const turnosOrdenados = useMemo(() => {
    const arr = Array.isArray(turnos) ? [...turnos] : [];
    arr.sort((a, b) => {
      const da = parseTurnoDateTime(a);
      const db = parseTurnoDateTime(b);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
    return arr;
  }, [turnos]);

  const turnosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return turnosOrdenados;
    return turnosOrdenados.filter((t) => {
      const servicio = servicios[t.servicioId] || servicios[t.servicio] || t.servicio;
      const nombreServicio = typeof servicio === 'string'
        ? servicio
        : (servicio?.nombre || t?.servicioNombre || t?.servicio_nombre || '');
      const fechaTxt = String(t?.fecha || '');
      const horaTxt = String(t?.hora || '');
      const estadoTxt = String(t?.estado || '').split('_').join(' ');
      return (
        nombreServicio.toLowerCase().includes(q) ||
        fechaTxt.toLowerCase().includes(q) ||
        horaTxt.toLowerCase().includes(q) ||
        estadoTxt.toLowerCase().includes(q)
      );
    });
  }, [busqueda, servicios, turnosOrdenados]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, userId]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pagina]);

  const totalPaginas = Math.max(1, Math.ceil(turnosFiltrados.length / ITEMS_POR_PAGINA));
  const start = (pagina - 1) * ITEMS_POR_PAGINA;
  const end = start + ITEMS_POR_PAGINA;
  const mostrandoDesde = turnosFiltrados.length === 0 ? 0 : start + 1;
  const mostrandoHasta = Math.min(end, turnosFiltrados.length);
  const turnosPaginados = turnosFiltrados.slice(start, end);

  const cancelarTurno = async (turno) => {
    const turnoId = getTurnoId(turno);
    if (!turnoId) return;
    const ok = window.confirm('¿Seguro que querés cancelar este turno?');
    if (!ok) return;
    try {
      await turnosAPI.update(turnoId, { estado: 'cancelado' });
      setTurnos((prev) => (Array.isArray(prev) ? prev.map((t) => (getTurnoId(t) === turnoId ? { ...t, estado: 'cancelado' } : t)) : prev));
      setModalTurnoId(null);
    } catch (err) {
      alert('Error al cancelar el turno');
    }
  };

  return (
    <>
      <div className="mis-turnos-page">
        <div className="mis-turnos-header" ref={topRef}>
          <h1>
            <span className="header-icon"><Calendar size={28} /></span>
            Mis Turnos
          </h1>
          <p>Administrá tus reservas</p>
        </div>
        <SnakeBanner show={Array.isArray(turnos) && turnos.some(t => t.estado === 'en_proceso')} />
        <div className="container">
          {loading ? (
            <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
              <div className="spinner"></div>
              <p>Cargando tus turnos...</p>
            </div>
          ) : (
            <div className="turnos-section">
              <h2 className="section-title">
                <CheckCircle size={28} />
                Todos mis turnos
              </h2>
              <div className="turnos-toolbar">
                <div className="search-box">
                  <Search size={20} />
                  <input
                    placeholder="Buscar por servicio, fecha, hora o estado..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    aria-label="Buscar turnos"
                  />
                </div>
              </div>

              <div className="historial-table-frame">
                <div className="turnos-list-header">
                  <div className="turnos-summary">
                    Mostrando {mostrandoDesde}-{mostrandoHasta} de {turnosFiltrados.length}
                  </div>

                  {turnosFiltrados.length > ITEMS_POR_PAGINA && (
                    <div className="turnos-pager turnos-pager-slim" aria-label="Paginación mis turnos">
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

                {turnosPaginados.length > 0 ? (
                  <div className="turnos-table mis-turnos-table" role="table" aria-label="Mis turnos">
                    <div className="turnos-row turnos-row-header" role="row">
                      <div className="turnos-cell cell-servicio" role="columnheader">
                        <span className="turnos-num turnos-num-header">N°</span>
                        <span>Servicio</span>
                      </div>
                      <div className="turnos-cell cell-fechaHora" role="columnheader">Fecha y hora</div>
                      <div className="turnos-cell cell-estado" role="columnheader">Estado</div>
                      <div className="turnos-cell cell-opciones" role="columnheader">Ver</div>
                    </div>

                    {turnosPaginados.map((turno, idx) => {
                      const servicio = servicios[turno.servicioId] || servicios[turno.servicio] || turno.servicio;
                      const nombreServicio = typeof servicio === 'string'
                        ? servicio
                        : (servicio?.nombre || turno?.servicioNombre || turno?.servicio_nombre || 'Servicio');

                      const { badge, badgeClass } = getEstadoBadgeInfo(turno);

                      const rowNum = start + idx + 1;
                      const turnoId = getTurnoId(turno) || `${rowNum}`;

                      let fechaHoraTxt = 'Fecha inválida';
                      try {
                        const fecha = new Date(`${turno.fecha}T00:00:00`);
                        const fechaOk = !Number.isNaN(fecha.getTime());
                        if (fechaOk) {
                          const fechaForm = format(fecha, 'dd/MM/yyyy', { locale: es });
                          fechaHoraTxt = `${fechaForm} · ${turno.hora ? `${turno.hora} hs` : '-'}`;
                        }
                      } catch {}

                      return (
                        <div key={turnoId} className="turnos-row" role="row">
                          <div className="turnos-cell cell-servicio" role="cell">
                            <span className="turnos-num">{rowNum}</span>
                            <div className="turnos-servicio-info">
                              <span className="turnos-servicio-nombre">{nombreServicio}</span>
                              <div className="turnos-servicio-meta" aria-label="Detalle del turno">
                                <span className="turnos-meta-fecha">
                                  <Clock size={14} />
                                  {fechaHoraTxt}
                                </span>
                                <span className={badgeClass}>{badge}</span>
                              </div>
                            </div>
                          </div>

                          <div className="turnos-cell cell-fechaHora" role="cell">
                            {fechaHoraTxt}
                          </div>

                          <div className="turnos-cell cell-estado" role="cell">
                            <span className={badgeClass}>{badge}</span>
                          </div>

                          <div className="turnos-cell cell-opciones" role="cell">
                            <button
                              className="turnos-editar-btn"
                              onClick={() => setModalTurnoId(getTurnoId(turno))}
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
                ) : (
                  <div style={{ textAlign: 'center', width: '100%', fontSize: '1.05rem', color: '#888', marginTop: '18px', padding: '18px 10px' }}>
                    No se encontraron turnos con esa búsqueda.
                  </div>
                )}

                {turnosFiltrados.length > ITEMS_POR_PAGINA && (
                  <div className="turnos-bottom-pager" aria-label="Paginación mis turnos (abajo)">
                    <div className="turnos-pager turnos-pager-slim">
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
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {modalTurnoId && (() => {
          const turnoSel = turnosOrdenados.find((t) => getTurnoId(t) === modalTurnoId);
          if (!turnoSel) return null;
          const servicioSel = servicios[turnoSel.servicioId] || servicios[turnoSel.servicio] || turnoSel.servicio;

          const fechaTurno = parseTurnoDateTime(turnoSel);
          const ahora = new Date();
          const diffHoras = fechaTurno ? (fechaTurno.getTime() - ahora.getTime()) / (1000 * 60 * 60) : 0;
          const puedeCancelar = turnoSel.estado === 'confirmado' && diffHoras > 48;

          return (
            <ModalTurnoDetalle
              turno={turnoSel}
              servicio={typeof servicioSel === 'string' ? { nombre: servicioSel } : servicioSel}
              puedeCancelar={puedeCancelar}
              onCancelar={cancelarTurno}
              onClose={() => setModalTurnoId(null)}
            />
          );
        })()}

      {/* Botón flotante solo para móviles */}

      <div className="ir-reservar-mobile">
        <button onClick={() => window.location.href = '/reservar'}>
          <span role="img" aria-label="Calendario">📅</span> Reservar nuevo turno
        </button>
      </div>
    </div>
  </>);
}

export default MisTurnos;
