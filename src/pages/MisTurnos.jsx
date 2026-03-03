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
      Verificá tu Gmail para ver la confirmación del turno. Si tu turno está "en proceso", recargá la página más tarde: puede ser confirmado o rechazado en cualquier momento.
      <span role="img" aria-label="serpiente"></span>
    </>
  );
  return (
    <div style={{
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
    }}>
      <div style={{
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
      }}>
        <div style={{
          width: '100%',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'inline-flex',
            whiteSpace: 'nowrap',
            alignItems: 'center',
            width: 'max-content',
            animation: 'snake-banner-move 22s linear infinite',
          }}>
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
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { turnosAPI, serviciosAPI } from '../services/api';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import './MisTurnos.css';

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
  const [modalCancelar, setModalCancelar] = useState({ open: false, turno: null });
  const [servicios, setServicios] = useState({});
  const [loading, setLoading] = useState(true);


  // Log para detectar doble render y cambios de usuario
  const renderRef = useRef(0);
  renderRef.current++;
  console.log('[MisTurnos] Render número:', renderRef.current, '| Usuario:', user?._id || user?.id, user);

  useEffect(() => {
    if (!user || (!user._id && !user.id)) return;
    // Log clave: usuario usado para buscar turnos
    console.log('[MisTurnos] useEffect disparado. Usuario para buscar turnos:', user?._id || user?.id, user);
    let cancelado = false;
    async function cargarDatos() {
      setLoading(true);
      try {
        const turnosRes = await turnosAPI.getByUsuario(user._id || user.id);
        if (!cancelado) setTurnos(turnosRes || []);
      } catch (err) {
        if (!cancelado) setTurnos([]);
      }
      try {
        const serviciosRes = await serviciosAPI.getAll();
        const serviciosObj = {};
        (serviciosRes || []).forEach(s => { serviciosObj[s.id] = s; });
        if (!cancelado) setServicios(serviciosObj);
      } catch (err) {
        if (!cancelado) setServicios({});
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    cargarDatos();
    return () => { cancelado = true; };
  }, [user]);
  // Log clave: estado final del array turnos antes del render
  console.log('[MisTurnos] Turnos para renderizar:', turnos);
  return (
    <>
      <div className="mis-turnos-page">
        <div className="mis-turnos-header">
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
              <div className="turnos-grid">
                {Array.isArray(turnos) && turnos.length > 0 ? (
                  [...turnos]
                    .sort((a, b) => {
                      const fechaA = new Date(a.fecha + 'T' + (a.hora || '00:00'));
                      const fechaB = new Date(b.fecha + 'T' + (b.hora || '00:00'));
                      return fechaB - fechaA;
                    })
                    .map((turno, idx) => {
                      let servicio = servicios[turno.servicioId] || servicios[turno.servicio] || turno.servicio;
                      let nombreServicio = '';
                      if (typeof servicio === 'string') {
                        nombreServicio = servicio;
                      } else if (servicio && typeof servicio === 'object') {
                        nombreServicio = servicio.nombre || '';
                      }
                      let fechaValida = false;
                      let fechaFormateada = '';
                      try {
                        const fecha = new Date(turno.fecha + 'T00:00:00');
                        fechaValida = !isNaN(fecha);
                        if (fechaValida) {
                          fechaFormateada = format(fecha, 'dd/MM/yyyy', { locale: es });
                        }
                      } catch {}
                      // Badge minimalista igual a historial
                      let badge = '';
                      let badgeClass = 'turno-badge';
                      // Mostrar badge 'rechazado' si corresponde
                      if (turno.estado === 'cancelado' || turno.estadoTransferencia === 'rechazado') {
                        badge = 'rechazado';
                        badgeClass += ' rechazado-violeta';
                      } else {
                        switch (turno.estado) {
                          case 'en_proceso':
                            badge = 'en proceso';
                            badgeClass += ' en-proceso';
                            break;
                          case 'devuelto':
                            badge = 'devuelto';
                            badgeClass += ' devuelto';
                            break;
                          case 'confirmado':
                            badge = 'confirmado';
                            badgeClass += ' confirmado';
                            break;
                          case 'expirado':
                            badge = 'expirado';
                            badgeClass += ' expirado';
                            break;
                          case 'completado':
                          default:
                            badge = 'completado';
                            badgeClass += ' completado';
                            break;
                        }
                      }
                      const keyTurno = turno.id || turno._id || idx;
                      const fechaTurno = new Date(turno.fecha + 'T' + (turno.hora || '00:00'));
                      const ahora = new Date();
                      const diffHoras = (fechaTurno - ahora) / (1000 * 60 * 60);
                      const puedeCancelar = turno.estado === 'confirmado' && diffHoras > 48;
                      return (
                        <div key={keyTurno} className="turno-card">
                          <div className={badgeClass}>
                            {turno.estado === 'en_proceso' ? (
                              <span style={{ color: '#ff9800', fontWeight: 'bold' }}>{badge}</span>
                            ) : badge}
                          </div>
                          <h3>{nombreServicio}</h3>
                          <div className="turno-info">
                            <div className="info-item">
                              <Calendar size={18} />
                              <span>{fechaValida ? fechaFormateada : 'Fecha inválida'}</span>
                            </div>
                            <div className="info-item">
                              <Clock size={18} />
                              <span>{turno.hora ? `${turno.hora} hs` : ''}</span>
                            </div>
                          </div>
                          <div className="turno-pago">
                            <div className="pago-item">
                              <span>Seña pagada:</span>
                              <strong>${turno.montoPagado?.toLocaleString?.() ?? '-'}</strong>
                            </div>
                            <div className="pago-item">
                              <span>Resto a pagar:</span>
                              <strong>${turno.montoTotal && turno.montoPagado != null ? (turno.montoTotal - turno.montoPagado).toLocaleString() : '-'}</strong>
                            </div>
                          </div>
                          {/* Si el turno está rechazado, solo mostrar el badge, sin botón */}
                          {null}
                          {puedeCancelar && (
                            <div className="turno-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                className="btn btn-danger"
                                style={{ marginLeft: '12px', padding: '6px 16px', borderRadius: '8px', background: '#e53935', color: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                onClick={() => setModalCancelar({ open: true, turno })}
                              >Cancelar</button>
                            </div>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <div style={{ textAlign: 'center', width: '100%', fontSize: '1.2rem', color: '#888', marginTop: '40px' }}>
                    No tenés turnos reservados.
                  </div>
                )}
              </div>
            </div>
          )}
          {modalCancelar.open && createPortal(
            <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.25)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{background:'#fff',borderRadius:'18px',boxShadow:'0 8px 40px rgba(180,0,90,0.18)',padding:'38px 32px',minWidth:'320px',maxWidth:'95vw',width:'380px',animation:'modalScaleIn .4s',position:'relative',display:'flex',flexDirection:'column'}}>
                <button style={{position:'absolute',top:18,right:18,background:'none',border:'none',fontSize:'1.3rem',color:'#e53935',cursor:'pointer',zIndex:2}} onClick={()=>setModalCancelar({open:false,turno:null})} title="Cerrar">×</button>
                <h3 style={{marginBottom:'22px',fontWeight:'bold',fontSize:'1.25rem',color:'#e53935'}}>Cancelar turno</h3>
                <p>¿Seguro que deseas cancelar el turno de <b>{modalCancelar.turno?.hora} hs</b> el <b>{format(new Date(modalCancelar.turno?.fecha + 'T00:00:00'), 'dd/MM/yyyy')}</b>?</p>
                <div style={{display:'flex',justifyContent:'flex-end',gap:'12px',marginTop:'28px'}}>
                  <button style={{background:'#fff',color:'#e53935',border:'1.5px solid #e53935',borderRadius:'8px',padding:'8px 22px',fontWeight:'bold',fontSize:'1rem'}} onClick={()=>setModalCancelar({open:false,turno:null})}>No, volver</button>
                  <button style={{background:'linear-gradient(90deg,#e53935,#e57373)',color:'#fff',border:'none',borderRadius:'8px',padding:'8px 22px',fontWeight:'bold',fontSize:'1rem'}} onClick={async()=>{
                    try {
                      await turnosAPI.update(modalCancelar.turno.id, { estado: 'cancelado' });
                      setTurnos(turnos.map(t => t.id === modalCancelar.turno.id ? { ...t, estado: 'cancelado' } : t));
                      setModalCancelar({open:false,turno:null});
                    } catch (err) {
                      alert('Error al cancelar el turno');
                    }
                  }}>Sí, cancelar turno</button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>

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
