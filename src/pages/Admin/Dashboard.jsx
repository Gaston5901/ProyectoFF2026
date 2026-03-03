import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { turnosAPI, serviciosAPI, usuariosAPI } from '../../services/api';
import { LayoutDashboard, Calendar, DollarSign, Users, TrendingUp, Package } from 'lucide-react';
import FabTurnosTransferencia from './FabTurnosTransferencia';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import './Admin.css';

const Dashboard = () => {

  const [stats, setStats] = useState({
    turnosHoy: 0,
    turnosMes: 0,
    gananciasMes: 0,
    clientes: 0,
    clientesNuevosMes: 0,
  });
  const [turnosHoy, setTurnosHoy] = useState([]);
  const [servicios, setServicios] = useState({});
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    cargarDatos();
  }, []);

  // Permite recargar datos desde hijos (FabTurnosTransferencia)
  const handleReloadDatos = () => {
    cargarDatos();
  };

  function cargarDatos() {
    (async () => {
      try {
        const [turnosRes, serviciosRes, usuariosRes] = await Promise.all([
          turnosAPI.getAll(),
          serviciosAPI.getAll(),
          usuariosAPI.getAll(),
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

        // Clientes nuevos este mes
        const usuarioIdsMes = [...new Set(turnosDelMes.map(t => t.usuarioId))];
        // Para cada usuario, buscar si tiene turnos previos al mes
        const clientesNuevosMes = usuarioIdsMes.filter(uid => {
          const prevTurnos = turnosRes.data.find(t => t.usuarioId === uid && t.fecha < inicioMes);
          return !prevTurnos;
        }).length;

        const gananciasMes = turnosDelMes.reduce((sum, t) => sum + t.montoPagado, 0);
        const clientesUnicos = usuariosRes.data.filter((u) => u.rol === 'cliente').length;

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
        <FabTurnosTransferencia onReloadDatos={handleReloadDatos} />
        <div className="admin-header">
          <h1 style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
            <LayoutDashboard size={36} style={{verticalAlign:'middle'}} />
            <span>Panel de Administración</span>
          </h1>
          <p>Resumen y estadísticas del estudio</p>
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
          <div className="admin-sections" style={{gap:'24px'}}>
            <div className="admin-section" style={{minWidth:'320px'}}>
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
                          <p className="turno-id">ID: {t.pagoId}</p>
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
            <div className="admin-section" style={{minWidth:'320px'}}>
              <h2 style={{fontSize:'20px'}}>Acciones Rápidas</h2>
              <div className="quick-actions">
                <Link to="/admin/servicios" className="quick-action-card">
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
                  <p>Ver clientes y admins</p>
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
          </div>
        </div>
      </div>
    );
};

export default Dashboard;
