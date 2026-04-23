import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { turnosAPI, serviciosAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Calendar, Users, TrendingUp, Package, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import FabTurnosTransferencia from './FabTurnosTransferencia';
import FabReportes from './FabReportes';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import './Admin.css';

const Dashboard = () => {

  const { isSuperAdmin } = useAuth();
  const roleLabel = isSuperAdmin() ? 'Super admin' : 'Admin';

  const [stats, setStats] = useState({
    turnosHoy: 0,
    turnosMes: 0,
    gananciasMes: 0,
    clientes: 0,
    clientesNuevosMes: 0,
  });
  const [turnosHoy, setTurnosHoy] = useState([]);
  const [turnosAll, setTurnosAll] = useState([]);
  const [servicios, setServicios] = useState({});
  const [loading, setLoading] = useState(true);
  const [showProximosModal, setShowProximosModal] = useState(false);
  const [proximosPage, setProximosPage] = useState(1);
  const proximosPerPage = 5;
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (!showProximosModal) return;
    const intervalId = setInterval(() => {
      setNowTick(Date.now());
    }, 60000);
    return () => clearInterval(intervalId);
  }, [showProximosModal]);

  useEffect(() => {
    if (!showProximosModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showProximosModal]);


  useEffect(() => {
    cargarDatos();
  }, []);

  const getTurnoDisplayId = (turno) => turno?.pagoId || turno?.id || '';

  // Permite recargar datos desde hijos (FabTurnosTransferencia)
  const handleReloadDatos = () => {
    cargarDatos();
  };

  function cargarDatos() {
    (async () => {
      try {
        const [turnosRes, serviciosRes] = await Promise.all([
          turnosAPI.getAll(),
          serviciosAPI.getAll(),
        ]);

        const serviciosMap = {};
        serviciosRes.data.forEach((s) => {
          serviciosMap[s.id] = s;
        });
        setServicios(serviciosMap);

        const hoy = format(new Date(), 'yyyy-MM-dd');
        const inicioMes = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const finMes = format(endOfMonth(new Date()), 'yyyy-MM-dd');

        const turnosDelDia = turnosRes.data.filter((t) => t.fecha === hoy && t.estado !== 'en_proceso');
        const turnosDelMes = turnosRes.data.filter(
          (t) => t.fecha >= inicioMes && t.fecha <= finMes && t.estado !== 'en_proceso'
        );

        setTurnosAll(Array.isArray(turnosRes.data) ? turnosRes.data : []);

        // Clientes nuevos este mes
        const usuarioIdsMes = [...new Set(turnosDelMes.map(t => t.usuarioId))];
        // Para cada usuario, buscar si tiene turnos previos al mes
        const clientesNuevosMes = usuarioIdsMes.filter(uid => {
          const prevTurnos = turnosRes.data.find(t => t.usuarioId === uid && t.fecha < inicioMes);
          return !prevTurnos;
        }).length;

        const gananciasMes = turnosDelMes.reduce((sum, t) => sum + t.montoPagado, 0);
        const clientesUnicos = [...new Set(turnosRes.data.map((t) => String(t.usuarioId || '')))].filter(Boolean).length;

        setStats({
          turnosHoy: turnosDelDia.length,
          turnosMes: turnosDelMes.length,
          gananciasMes,
          clientes: clientesUnicos,
          clientesNuevosMes
        });

        setTurnosHoy(turnosDelDia.sort((a, b) => a.hora.localeCompare(b.hora)));
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    })();
  }

  const proximosTurnos = (() => {
    const ahora = new Date(nowTick);
    const estadosExcluidos = new Set(['completado', 'cancelado', 'rechazado', 'devuelto', 'expirado']);
    return (turnosAll || [])
      .filter((t) => {
        if (!t?.fecha) return false;
        if (estadosExcluidos.has(t.estado)) return false;

        // En este panel solo mostramos próximos turnos cuando ya están confirmados.
        if (t.estado !== 'confirmado') return false;

        const hora = t.hora || '00:00';
        const fechaHora = new Date(`${t.fecha}T${hora}:00`);
        if (Number.isNaN(fechaHora.getTime())) {
          // Fallback: si la fecha no parsea, al menos filtrar por string
          return t.fecha >= format(ahora, 'yyyy-MM-dd');
        }
        return fechaHora >= ahora;
      })
      .sort((a, b) => {
        const aDate = new Date(`${a.fecha}T${a.hora || '00:00'}:00`);
        const bDate = new Date(`${b.fecha}T${b.hora || '00:00'}:00`);
        return aDate.getTime() - bDate.getTime();
      });
  })();

  const formatEstadoLabel = (estado) => {
    const raw = String(estado || '').trim();
    if (!raw) return '';
    return raw.replace(/_/g, ' ').toUpperCase();
  };

  const proximosTotalPages = Math.max(1, Math.ceil((proximosTurnos.length || 0) / proximosPerPage));
  const proximosTurnosPaginados = proximosTurnos.slice(
    (proximosPage - 1) * proximosPerPage,
    proximosPage * proximosPerPage
  );


  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="spinner"></div>
        <p>Cargando panel...</p>
      </div>
    );
  }

  return (
      <div className="admin-page">
        {isSuperAdmin() && (
          <>
            <FabReportes offsetIndex={1} />
            <FabTurnosTransferencia onReloadDatos={handleReloadDatos} />
          </>
        )}
        <div className="admin-header">
          <h1 style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
            <LayoutDashboard size={36} style={{verticalAlign:'middle'}} />
            <span>Panel de Administración</span>
          </h1>
          <p>Estás en modo: <strong>{roleLabel}</strong></p>
        </div>
        <div className="container" style={{maxWidth:'1200px',margin:'0 auto'}}>
          <div className="stats-grid" style={{marginBottom:'32px'}}>
            <div className="stat-card">
              <span className="stat-icon" style={{background:'#ffb6d5'}}><Calendar size={28} /></span>
              <div className="stat-info">
                <h3>Turnos Hoy</h3>
                <div className="stat-number">{stats.turnosHoy}</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon" style={{background:'#f48fb1'}}><TrendingUp size={28} /></span>
              <div className="stat-info">
                <h3>Turnos Mes</h3>
                <div className="stat-number">{stats.turnosMes}</div>
              </div>
            </div>
            {/* <div className="stat-card">
              <span className="stat-icon" style={{background:'#ce93d8'}}><DollarSign size={28} /></span>
              <div className="stat-info">
                <h3>Ganancias Mes (Señas)</h3>
                <div className="stat-number">${stats.gananciasMes.toLocaleString()}</div>
              </div>
            </div> */}
            <div className="stat-card">
              <span className="stat-icon" style={{background:'#b2dfdb'}}><Users size={28} /></span>
              <div className="stat-info">
                <h3>Clientes</h3>
                <div className="stat-number">{stats.clientes}</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon" style={{background:'#ffe082'}}><Users size={28} /></span>
              <div className="stat-info">
                <h3>Clientes nuevos este mes</h3>
                <div className="stat-number">{stats.clientesNuevosMes}</div>
              </div>
            </div>
          </div>
          <div className="admin-sections dashboard-sections dashboard-sections-v2" style={{gap:'24px'}}>
            <div className="admin-section dashboard-proximos-card dashboard-proximos-wide" style={{minWidth:'320px'}}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setProximosPage(1);
                  setShowProximosModal(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setProximosPage(1);
                    setShowProximosModal(true);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <h2 style={{fontSize:'20px', margin: 0}}>Próximos servicios a realizar</h2>
                <span style={{display:'flex',alignItems:'center',gap:8,color:'#d13fa0',fontWeight:700}}>
                  {proximosTurnos.length}
                  {showProximosModal ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </span>
              </div>
            </div>

            <div
              className={`admin-section dashboard-turnos-hoy ${!isSuperAdmin() ? 'dashboard-span-full' : ''}`}
              style={{minWidth:'320px'}}
            >
              <h2 style={{fontSize:'20px'}}>Turnos de Hoy</h2>
              <div className="turnos-hoy-list">
                {turnosHoy.length > 0 ? (
                  turnosHoy.map((t) => {
                    const esRechazado = t.estado === 'rechazado';
                    const esConfirmado = t.estado === 'confirmado';
                    let estilo = {};
                    if (esRechazado) {
                      estilo = {
                        background: 'rgba(160,32,240,0.08)',
                        border: '1.5px solid #a020f0',
                        color: '#a020f0',
                        fontWeight: 600
                      };
                    } else if (esConfirmado) {
                      estilo = {
                        background: 'rgba(56,142,60,0.08)',
                        border: '1.5px solid #388e3c',
                        color: '#388e3c',
                        fontWeight: 600
                      };
                    }
                    return (
                      <div
                        key={t.id}
                        className="turno-hoy-item"
                        style={estilo}
                      >
                        <div className="turno-hora">{t.hora}</div>
                        <div className="turno-detalles">
                          <h4>{servicios[t.servicioId]?.nombre}</h4>
                          <p>{t.montoPagado ? `Pagado: $${t.montoPagado}` : 'Sin pago'}</p>
                          <p className="turno-id">ID pago: {getTurnoDisplayId(t)}</p>
                        </div>
                        <div className={`turno-estado ${t.estado}`}>{t.estado}</div>
                      </div>
                    );
                  })
                ) : (
                  <p className="no-data">No hay turnos para hoy</p>
                )}
              </div>
            </div>

            {isSuperAdmin() && (
              <div className="admin-section" style={{minWidth:'320px'}}>
                <h2 style={{fontSize:'20px'}}>Acciones Rápidas</h2>
                <div className="quick-actions">
                  <Link to="/admin/servicios-admin" className="quick-action-card">
                    <Package size={28} />
                    <h3>Servicios</h3>
                    <p>Gestionar servicios</p>
                  </Link>
                  <Link to="/admin/turnos" className="quick-action-card">
                    <Calendar size={28} />
                    <h3>Turnos</h3>
                    <p>Ver y administrar turnos</p>
                  </Link>
                  <Link to="/admin/usuarios" className="quick-action-card">
                    <Users size={28} />
                    <h3>Usuarios</h3>
                    <p>Crear y gestionar admins</p>
                  </Link>
                  <Link to="/admin/estadisticas" className="quick-action-card">
                    <TrendingUp size={28} />
                    <h3>Estadísticas</h3>
                    <p>Ver estadísticas y reportes</p>
                  </Link>
                  <Link to="/admin/editar-carrusel" className="quick-action-card">
                    <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:28,height:28,fontSize:28,color:'#d13fa0'}}>🖼️</span>
                    <h3>Editar Carrusel</h3>
                    <p>Cambiar imágenes del inicio</p>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {showProximosModal && (
          <>
            <div
              className="proximos-modal-overlay"
              onClick={() => setShowProximosModal(false)}
              aria-hidden="true"
            />
            <div
              className="proximos-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Próximos servicios a realizar"
            >
              <div className="proximos-modal-header">
                <div style={{display:'flex',flexDirection:'column',gap:2}}>
                  <h3 style={{margin:0}}>Próximos servicios a realizar</h3>
                  <span style={{color:'var(--text-light)',fontWeight:600,fontSize:13}}>
                    Total: {proximosTurnos.length}
                  </span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  {proximosTotalPages > 1 && (
                    <div className="proximos-modal-pager" aria-label="Paginación">
                      <button
                        type="button"
                        className="proximos-page-btn"
                        onClick={() => setProximosPage((p) => Math.max(1, p - 1))}
                        disabled={proximosPage === 1}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="proximos-page-indicator">
                        {proximosPage}/{proximosTotalPages}
                      </span>
                      <button
                        type="button"
                        className="proximos-page-btn"
                        onClick={() => setProximosPage((p) => Math.min(proximosTotalPages, p + 1))}
                        disabled={proximosPage === proximosTotalPages}
                        aria-label="Página siguiente"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                  <button
                    className="proximos-modal-close"
                    onClick={() => setShowProximosModal(false)}
                    aria-label="Cerrar"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="proximos-modal-body">
                <div className="turnos-hoy-list proximos-list">
                  {proximosTurnos.length > 0 ? (
                    proximosTurnosPaginados.map((t) => {
                      const servicioNombre = servicios[t.servicioId]?.nombre || 'Servicio';
                      const clienteNombre =
                        t.nombre ||
                        t.usuarioNombre ||
                        t.usuario?.nombre ||
                        t.username ||
                        t.usuarioUsername ||
                        t.usuario?.username ||
                        (t.email ? String(t.email).split('@')[0] : '') ||
                        'Sin nombre';

                      return (
                        <div key={t.id} className="turno-hoy-item" style={{background:'#fff'}}>
                          <div className="turno-hora">{t.hora || '--:--'}</div>
                          <div className="turno-detalles">
                            <h4>{servicioNombre}</h4>
                            <p>{clienteNombre}</p>
                            <p className="turno-id">
                              {format(new Date(t.fecha + 'T00:00:00'), 'dd/MM')} · {t.hora || '--:--'} hs · ID pago: {getTurnoDisplayId(t)}
                            </p>
                          </div>
                          <div className={`turno-estado ${t.estado}`}>{formatEstadoLabel(t.estado)}</div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-data" style={{padding: 18}}>No hay próximos turnos</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
};

export default Dashboard;
