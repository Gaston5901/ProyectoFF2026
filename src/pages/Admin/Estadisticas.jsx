import { useState, useEffect } from 'react';
import { turnosAPI, serviciosAPI } from '../../services/api';
import { TrendingUp, DollarSign, Calendar, Award } from 'lucide-react';
import { format, endOfMonth, startOfYear, endOfYear } from 'date-fns';

import PieServicios from './PieServicios';
import BarrasServicios from './BarrasServicios';
import BarrasGanancias from './BarrasGanancias';
import LineaGanancias from './LineaGanancias';

import './Admin.css';
// Etiquetas de meses para evolución
const mesesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const Estadisticas = () => {
  const [periodo, setPeriodo] = useState('mes'); // 'mes' | 'año'
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const [tipoGanancia, setTipoGanancia] = useState('seña');

  // Declarar stats antes de cualquier uso
  const [stats, setStats] = useState({
    totalTurnos: 0,
    totalGanancias: 0,
    promedioGanancia: 0,
    servicioMasSolicitado: null,
    serviciosStats: [],
  });

  // Calcula valores según tipo de ganancia
  const totalGananciasMostrar = tipoGanancia === 'total' ? stats.totalGanancias * 2 : stats.totalGanancias;
  const promedioGananciaMostrar = tipoGanancia === 'total' ? stats.promedioGanancia * 2 : stats.promedioGanancia;

  // Filtros exclusivos para el gráfico de torta
  const [piePeriodo, setPiePeriodo] = useState('mes');
  const [pieAnio, setPieAnio] = useState(new Date().getFullYear());
  const [pieMes, setPieMes] = useState(new Date().getMonth() + 1);

  // PieData filtrado y con porcentajes
  const [pieData, setPieData] = useState([]);

// ...existing code...
  const [evolucionData, setEvolucionData] = useState([]);

// ...existing code...
  const SERVICE_COLORS = [
    '#e57373', // rojo
    '#f06292', // rosa
    '#ba68c8', // violeta
    '#64b5f6', // azul
    '#4db6ac', // turquesa
    '#81c784', // verde
    '#ffd54f', // amarillo
    '#ffb74d', // naranja
    '#a1887f', // marrón
    '#90a4ae', // gris
  ];

  // Util: obtener id de un objeto (soporta id o _id)
  const getId = obj => (obj && (obj.id || obj._id)) || null;

  // Util: parse monto (asegura número)
  const parseMonto = v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Util: formatea moneda simple
  const formatMoney = (n) => `$${Number(n).toLocaleString()}`;


  // -------------------------
  // 🔹 Cargar evolución últimos 12 meses (auto-actualizable)
  // -------------------------
  useEffect(() => {
    let mounted = true;
    let intervalId;
    const fetchEvolucion = async () => {
      try {
        const turnosRes = await turnosAPI.getAll();
        const turnos = Array.isArray(turnosRes.data) ? turnosRes.data : [];
        const hoy = new Date();
        const meses = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
          const y = d.getFullYear();
          const m = d.getMonth();
          const label = `${mesesLabels[m]} ${y}`;
          // Rango de fechas del mes
          const inicio = new Date(y, m, 1);
          const fin = new Date(y, m + 1, 0, 23, 59, 59, 999);
          // Filtrar turnos por mes y año usando getFullYear y getMonth (local)
          const turnosMes = turnos.filter(t => {
            const fechaTurno = new Date(t.fecha);
            return fechaTurno >= inicio && fechaTurno <= fin && !t.seniaDevuelta;
          });
          // Sumar ganancias de turnos completados según registroEstadistica
          const gananciaCompletados = turnosMes
            .filter(t => (t.estado || '').toLowerCase().trim() === 'completado')
            .reduce((sum, t) => {
              if (t.registroEstadistica === 'seña') {
                return sum + parseMonto(t.montoPagado);
              }
              if (t.registroEstadistica === 'total') {
                return sum + parseMonto(t.montoTotal);
              }
              if (parseMonto(t.montoPagado) < parseMonto(t.montoTotal)) {
                return sum + parseMonto(t.montoPagado);
              }
              return sum + parseMonto(t.montoTotal);
            }, 0);
          // Ganancia total del mes
          const ganancia = gananciaCompletados;
          meses.push({ mes: label, ganancia });
        }
        if (mounted) setEvolucionData(meses);
      } catch (err) {
        console.error('Error cargando evolución:', err);
      }
    };
    fetchEvolucion();
    intervalId = setInterval(fetchEvolucion, 30000); // cada 30 segundos
    return () => { mounted = false; clearInterval(intervalId); };
  }, []);


  // -------------------------
  // 🔹 Cargar estadísticas según período (auto-actualizable)
  // -------------------------
  useEffect(() => {
    let intervalId;
    const cargarYDesmarcar = async () => {
      await cargarEstadisticas();
      setPrimeraCarga(false);
    };
    cargarYDesmarcar();
    intervalId = setInterval(() => {
      cargarEstadisticas(false); // recarga silenciosa
    }, 30000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, anio, mes]);

  // Si 'silencioso' es true, no mostrar loading
  const cargarEstadisticas = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const [turnosRes, serviciosRes] = await Promise.all([
        turnosAPI.getAll(),
        serviciosAPI.getAll(),
      ]);

      const turnos = Array.isArray(turnosRes.data) ? turnosRes.data : [];
      const servicios = Array.isArray(serviciosRes.data) ? serviciosRes.data : [];

      // Map servicios por id (soporta id o _id)
      const serviciosMap = {};
      servicios.forEach(s => {
        const id = getId(s);
        if (id) serviciosMap[id] = s;
      });

      // Rango de fechas (como Date) para comparar con new Date(t.fecha)
      let fechaInicioDate, fechaFinDate;
      if (periodo === 'mes') {
        fechaInicioDate = new Date(anio, mes - 1, 1);
        fechaFinDate = new Date(anio, mes - 1, endOfMonth(new Date(anio, mes - 1, 1)).getDate());
      } else {
        fechaInicioDate = new Date(anio, 0, 1);
        fechaFinDate = new Date(anio, 11, endOfYear(new Date(anio, 0, 1)).getDate());
      }

      // Excluir turnos con seña devuelta y en_proceso
      const turnosFiltrados = turnos.filter(t => {
        const fechaTurno = new Date(t.fecha);
        return fechaTurno >= fechaInicioDate && fechaTurno <= fechaFinDate && !t.seniaDevuelta && t.estado !== 'en_proceso';
      });



      // Total de señas: suma montoPagado de todos los turnos filtrados (del mes/año)
      const totalSenias = turnosFiltrados.reduce((sum, t) => sum + parseMonto(t.montoPagado), 0);

      // Ganancia real: suma según registroEstadistica ('seña' o 'total')
      const totalGanancias = turnosFiltrados.filter(t => t.estado === 'completado').reduce((sum, t) => {
        if (t.registroEstadistica === 'seña') {
          return sum + parseMonto(t.montoPagado);
        }
        if (t.registroEstadistica === 'total') {
          return sum + parseMonto(t.montoTotal);
        }
        // Fallback: lógica anterior por si falta el campo
        if (parseMonto(t.montoPagado) < parseMonto(t.montoTotal)) {
          return sum + parseMonto(t.montoPagado);
        }
        return sum + parseMonto(t.montoTotal);
      }, 0);

      const promedioGanancia =
        turnosFiltrados.length > 0
          ? Math.round(totalGanancias / turnosFiltrados.length)
          : 0;

      const serviciosCount = {};
      const serviciosGanancias = {};

      // Solo sumar ganancias de servicios completados para el gráfico
      turnosFiltrados.forEach(t => {
        const id = t.servicioId || t.servicio || getId(t.servicio) || null;
        if (!id) return;
        serviciosCount[id] = (serviciosCount[id] || 0) + 1;
        if (t.estado === 'completado') {
          if (t.registroEstadistica === 'seña') {
            serviciosGanancias[id] = (serviciosGanancias[id] || 0) + parseMonto(t.montoPagado);
          } else if (t.registroEstadistica === 'total') {
            serviciosGanancias[id] = (serviciosGanancias[id] || 0) + parseMonto(t.montoTotal);
          } else {
            // Fallback: lógica anterior
            if (parseMonto(t.montoPagado) < parseMonto(t.montoTotal)) {
              serviciosGanancias[id] = (serviciosGanancias[id] || 0) + parseMonto(t.montoPagado);
            } else {
              serviciosGanancias[id] = (serviciosGanancias[id] || 0) + parseMonto(t.montoTotal);
            }
          }
        }
        // Si no está completado, no suma nada al gráfico de ganancias
      });

      const serviciosStats = Object.keys(serviciosCount)
        .map(id => ({
          servicio: serviciosMap[id] || { nombre: 'Desconocido', id },
          cantidad: serviciosCount[id],
          ganancias: serviciosGanancias[id] || 0,
        }))
        .sort((a, b) => b.cantidad - a.cantidad);

      setStats({
        totalTurnos: turnosFiltrados.length,
        totalGanancias: totalSenias, // Solo señas para la card principal
        promedioGanancia,
        servicioMasSolicitado: serviciosStats[0] || null,
        serviciosStats,
        totalSenias, // por si se quiere mostrar en otro lado
        totalGananciasReales: totalGanancias, // por si se quiere mostrar abajo
      });
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
      // opcional: mostrar toast / notificación
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  // -------------------------
  // 🔹 Pie chart: datos y porcentajes (filtrado por controles propios)
  // -------------------------
  useEffect(() => {
    let mounted = true;
    const fetchPieData = async () => {
      try {
        const [turnosRes, serviciosRes] = await Promise.all([
          turnosAPI.getAll(),
          serviciosAPI.getAll(),
        ]);
        const turnos = Array.isArray(turnosRes.data) ? turnosRes.data : [];
        const servicios = Array.isArray(serviciosRes.data) ? serviciosRes.data : [];

        const serviciosMap = {};
        servicios.forEach(s => {
          const id = getId(s);
          if (id) serviciosMap[id] = s;
        });

        let fechaInicioDate, fechaFinDate;
        if (piePeriodo === 'mes') {
          fechaInicioDate = new Date(pieAnio, pieMes - 1, 1);
          fechaFinDate = new Date(pieAnio, pieMes - 1, endOfMonth(new Date(pieAnio, pieMes - 1, 1)).getDate());
        } else {
          fechaInicioDate = new Date(pieAnio, 0, 1);
          fechaFinDate = new Date(pieAnio, 11, endOfYear(new Date(pieAnio, 0, 1)).getDate());
        }

        const turnosFiltrados = turnos.filter(t => {
          const fechaTurno = new Date(t.fecha);
          return fechaTurno >= fechaInicioDate && fechaTurno <= fechaFinDate;
        });

        const serviciosCount = {};
        turnosFiltrados.forEach(t => {
          const id = t.servicioId || t.servicio || getId(t.servicio) || null;
          if (!id) return;
          serviciosCount[id] = (serviciosCount[id] || 0) + 1;
        });

        const total = Object.values(serviciosCount).reduce((a, b) => a + b, 0);
        const pie = Object.keys(serviciosCount)
          .map((id, idx) => ({
            id,
            name: serviciosMap[id]?.nombre || 'Desconocido',
            cantidad: serviciosCount[id],
            color: SERVICE_COLORS[idx % SERVICE_COLORS.length],
            porcentaje: total > 0 ? ((serviciosCount[id] / total) * 100).toFixed(1) : '0.0',
          }))
          .sort((a, b) => b.cantidad - a.cantidad);

        if (mounted) setPieData(pie);
      } catch (err) {
        console.error('Error cargando pie data:', err);
      }
    };

    fetchPieData();
    return () => { mounted = false; };
  }, [piePeriodo, pieAnio, pieMes, stats.serviciosStats.length]);

  if (primeraCarga && loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '120px 20px' }}>
        <div className="spinner" />
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><TrendingUp size={40} /> Estadísticas y Reportes</h1>
        <p>Análisis detallado del negocio</p>
      </div>

      <div className="container">

        {/* ------------------ SELECTOR DE PERÍODO --------------------- */}
        <div className="periodo-selector" style={{
          display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',
          marginBottom:18,background:'#f8bbd0',borderRadius:12,
          padding:'10px 12px',boxShadow:'0 2px 8px rgba(209,63,160,0.06)'
        }}>
          <button
            className={`btn ${periodo === 'mes' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriodo('mes')}
          >
            Por Mes
          </button>

          <button
            className={`btn ${periodo === 'año' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriodo('año')}
          >
            Por Año
          </button>

          <select value={anio} onChange={e => setAnio(Number(e.target.value))} className="select-anio-mes">
            {Array.from({ length: 6 }).map((_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>

          {periodo === 'mes' && (
            <select value={mes} onChange={e => setMes(Number(e.target.value))} className="select-anio-mes">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m.toString().padStart(2,'0')}</option>
              ))}
            </select>
          )}
        </div>

        {/* ------------------ ESTADÍSTICAS PRINCIPALES --------------------- */}
        <div className="stats-grid">
          <StatBig icon={<Calendar size={40} />} title="Total de Turnos"
            value={stats.totalTurnos} label={`En ${periodo === 'mes' ? 'este mes' : 'este año'}`} color="blue" />

          <StatBig icon={<DollarSign size={40} />} title="Total Ganancias (Señas)"
            value={formatMoney(stats.totalGanancias)} label="Solo señas pagadas" color="green" />

          <StatBig icon={<TrendingUp size={40} />} title="Promedio por Turno"
            value={formatMoney(stats.promedioGanancia)} label="Ganancia promedio" color="orange" />

          <StatBig icon={<Award size={40} />} title="Servicio Más Solicitado"
            value={stats.servicioMasSolicitado?.servicio?.nombre || stats.servicioMasSolicitado?.servicio?.nombre || stats.servicioMasSolicitado?.servicio?.nombre || stats.servicioMasSolicitado?.servicio?.nombre || (stats.servicioMasSolicitado?.servicio ? stats.servicioMasSolicitado.servicio.nombre : stats.servicioMasSolicitado?.servicio?.nombre) || (stats.servicioMasSolicitado?.servicio?.nombre) || (stats.servicioMasSolicitado?.servicio && stats.servicioMasSolicitado.servicio.nombre) || (stats.servicioMasSolicitado?.servicio ? stats.servicioMasSolicitado.servicio.nombre : (stats.servicioMasSolicitado?.servicio ?? 'N/A'))}
            label={`${stats.servicioMasSolicitado?.cantidad || 0} reservas`} color="purple" />
        </div>

        {/* ------------------ RANKING --------------------- */}
        <RankingServicios stats={stats.serviciosStats} />

        {/* ------------------ EVOLUCIÓN 12 MESES --------------------- */}
        <div style={{
          margin:'32px 0 24px 0',background:'#fff',
          borderRadius:'18px',boxShadow:'0 2px 12px rgba(209,63,160,0.07)',
          padding:'18px 0'
        }}>
          <h2 style={{textAlign:'center',marginBottom:8,fontWeight:'bold',color:'#d13fa0'}}>
            Evolución mensual de ganancias (últimos 12 meses)
          </h2>
          <LineaGanancias data={evolucionData} />
        </div>



        {/* ------------------ PIE CHART ABAJO CON FILTRO PROPIO --------------------- */}
        <div style={{
          margin:'32px auto 0 auto',background:'#fff',borderRadius:'16px',
          boxShadow:'0 2px 10px rgba(209,63,160,0.08)',padding:'16px 0',
          display:'flex',flexDirection:'column',alignItems:'center',
          maxWidth:360
        }}>
          <h2 style={{textAlign:'center',marginBottom:8,fontWeight:'bold',color:'#d13fa0',fontSize:20}}>
            Servicios más destacados
          </h2>
          {/* Filtros propios del gráfico de torta */}
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
            <button
              className={`btn ${piePeriodo === 'mes' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPiePeriodo('mes')}
            >
              Por Mes
            </button>
            <button
              className={`btn ${piePeriodo === 'año' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPiePeriodo('año')}
            >
              Por Año
            </button>
            <select value={pieAnio} onChange={e => setPieAnio(Number(e.target.value))} className="select-anio-mes">
              {Array.from({ length: 6 }).map((_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
            {piePeriodo === 'mes' && (
              <select value={pieMes} onChange={e => setPieMes(Number(e.target.value))} className="select-anio-mes">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m.toString().padStart(2,'0')}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{width:220,height:220,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <PieServicios data={pieData} />
          </div>
          {/* Referencias de colores de servicios con porcentaje */}
          <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:4,width:'90%'}}>
            {pieData.map((s, idx) => (
              <div key={s.id || s.name || idx} style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{display:'inline-block',width:16,height:16,borderRadius:4,background:s.color,border:'1px solid #eee'}} />
                <span style={{fontSize:14}}>{s.name} <span style={{color:'#888'}}>({s.porcentaje}%)</span></span>
              </div>
            ))}
          </div>
        </div>

                    {/* ------------------ NOTAS --------------------- */}
        <div className="info-adicional">
          <div className="info-card" style={{
            background: 'linear-gradient(120deg, #f8bbd0 60%, #fff 100%)',
            borderRadius: 18,
            boxShadow: '0 2px 12px rgba(209,63,160,0.10)',
            padding: '22px 28px',
            margin: '18px 0',
            maxWidth: 520,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{fontWeight:'bold',color:'#d13fa0',fontSize:22,marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
              <span role="img" aria-label="info">💡</span> Información Importante
            </h3>
            <ul style={{fontSize:16,lineHeight:1.7,marginBottom:10}}>
              <li><strong>Ganancias mostradas arriba:</strong> solo suman las <b>señas</b> cobradas por adelantado (50% del valor del servicio).</li>
              <li><strong>Ganancia real estimada:</strong> <span style={{color:'#388e3c'}}>{formatMoney(stats.totalGananciasReales || 0)}</span> (incluye señas + pagos finales de turnos completados).</li>
              <li><strong>Turnos completados:</strong> incluyen el pago final realizado en el local.</li>
              <li><strong>Turnos expirados:</strong> solo se suma la seña cobrada, ya que el cliente no asistió.</li>
              <li><strong>Ranking de servicios:</strong> muestra los servicios más reservados y sus ganancias por señas.</li>
              <li><strong>Evolución mensual:</strong> refleja la <b>ganancia real</b> de cada mes (señas + pagos finales de completados).</li>
            </ul>
            <div style={{display:'flex',flexWrap:'wrap',gap:18,marginTop:10,justifyContent:'center'}}>
              <div style={{background:'#fff',borderRadius:12,padding:'12px 18px',boxShadow:'0 1px 6px #d13fa022',minWidth:160}}>
                <span style={{fontWeight:'bold',color:'#4caf50'}}>Señas cobradas:</span><br/>
                <span style={{fontSize:18}}>{formatMoney(stats.totalGanancias)}</span>
              </div>
              <div style={{background:'#fff',borderRadius:12,padding:'12px 18px',boxShadow:'0 1px 6px #d13fa022',minWidth:160}}>
                <span style={{fontWeight:'bold',color:'#1976d2'}}>Turnos completados:</span><br/>
                <span style={{fontSize:18}}>{formatMoney(stats.totalGananciasReales || 0)}</span>
              </div>
              <div style={{background:'#fff',borderRadius:12,padding:'12px 18px',boxShadow:'0 1px 6px #d13fa022',minWidth:160}}>
                <span style={{fontWeight:'bold',color:'#ff9800'}}>Total de reservas:</span><br/>
                <span style={{fontSize:18}}>{stats.totalTurnos}</span>
              </div>
            </div>
            <div style={{marginTop:18,fontSize:14,color:'#888',textAlign:'center'}}>
              <span>Tip: Puedes cambiar el período de análisis (mes/año) con los selectores de arriba.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------
// 🔹 COMPONENTE DE TARJETA GRANDE
// ------------------------------------
const StatBig = ({ icon, title, value, label, color }) => {
  const colors = {
    blue: 'linear-gradient(135deg, #2196f3, #42a5f5)',
    green: 'linear-gradient(135deg, #4caf50, #66bb6a)',
    orange: 'linear-gradient(135deg, #ff9800, #ffa726)',
    purple: 'linear-gradient(135deg, #9c27b0, #ba68c8)',
  };

  return (
    <div className="stat-card-large">
      <div className="stat-icon-large" style={{ background: colors[color] }}>
        {icon}
      </div>
      <div className="stat-info-large">
        <h3>{title}</h3>
        <p className="stat-number-large">{value}</p>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
};

// ------------------------------------
// 🔹 COMPONENTE RANKING
// ------------------------------------

const medallas = [
  { icon: '🥇', color: '#ffd700' }, // oro
  { icon: '🥈', color: '#c0c0c0' }, // plata
  { icon: '🥉', color: '#cd7f32' }, // bronce
];

const RankingServicios = ({ stats }) => {
  if (!Array.isArray(stats) || stats.length === 0) {
    return (
      <div className="servicios-estadisticas">
        <h2 style={{marginBottom:8}}>Ranking de Servicios</h2>
        <p style={{padding:'12px 18px',color:'#666'}}>No hay datos para mostrar.</p>
      </div>
    );
  }

  const maxCantidad = stats[0]?.cantidad || 1;
  const maxGanancias = stats[0]?.ganancias || 1;

  return (
    <div className="servicios-estadisticas">
      <h2 style={{marginBottom:18, color:'#d13fa0', fontWeight:'bold'}}>Ranking de Servicios</h2>
      <div style={{display:'flex',flexWrap:'wrap',gap:18,justifyContent:'center'}}>
        {stats.map((item, i) => {
          const svcId = item.servicio && (item.servicio.id || item.servicio._id) || `svc-${i}`;
          const medalla = medallas[i] || null;
          return (
            <div
              key={svcId}
              style={{
                minWidth:260,
                background:'#fff',
                borderRadius:18,
                boxShadow:'0 2px 12px rgba(209,63,160,0.10)',
                padding:'18px 20px',
                marginBottom:8,
                display:'flex',
                flexDirection:'column',
                alignItems:'center',
                position:'relative',
                border: medalla ? `2.5px solid ${medalla.color}` : '1.5px solid #eee',
                transition:'transform 0.2s',
                zIndex: 1,
              }}
            >
              {/* Medalla o posición */}
              <div style={{
                position:'absolute',
                top:-18,
                left:'50%',
                transform:'translateX(-50%)',
                fontSize: medalla ? 36 : 22,
                fontWeight:'bold',
                color: medalla ? medalla.color : '#d13fa0',
                background:'#fff',
                borderRadius:'50%',
                boxShadow: medalla ? `0 2px 8px ${medalla.color}33` : 'none',
                padding: medalla ? '2px 10px' : '2px 10px',
                border: medalla ? `2px solid ${medalla.color}` : '1.5px solid #eee',
                zIndex:2
              }}>
                {medalla ? medalla.icon : i+1}
              </div>
              <h4 style={{marginTop:28,marginBottom:8,fontWeight:'bold',fontSize:20,color:'#d13fa0',textAlign:'center'}}>
                {item.servicio?.nombre || 'Desconocido'}
              </h4>
              <div style={{width:'100%',marginBottom:10}}>
                <span style={{fontSize:14,color:'#888'}}>Cantidad de reservas</span>
                <div style={{
                  background:'#f8bbd0',
                  borderRadius:8,
                  height:18,
                  marginTop:4,
                  marginBottom:2,
                  position:'relative',
                  overflow:'hidden',
                }}>
                  <div style={{
                    width:`${(item.cantidad / maxCantidad) * 100}%`,
                    background:'linear-gradient(90deg, #2196f3, #42a5f5)',
                    height:'100%',
                    borderRadius:8,
                    transition:'width 0.5s',
                  }} />
                  <span style={{
                    position:'absolute',
                    right:10,
                    top:0,
                    height:'100%',
                    display:'flex',
                    alignItems:'center',
                    fontWeight:'bold',
                    color:'#1976d2',
                    fontSize:15
                  }}>{item.cantidad}</span>
                </div>
              </div>
              <div style={{width:'100%'}}>
                <span style={{fontSize:14,color:'#888'}}>Ganancias </span>
                <div style={{
                  background:'#c8e6c9',
                  borderRadius:8,
                  height:18,
                  marginTop:4,
                  marginBottom:2,
                  position:'relative',
                  overflow:'hidden',
                }}>
                  <div style={{
                    width:`${(item.ganancias / maxGanancias) * 100}%`,
                    background:'linear-gradient(90deg, #4caf50, #66bb6a)',
                    height:'100%',
                    borderRadius:8,
                    transition:'width 0.5s',
                  }} />
                  <span style={{
                    position:'absolute',
                    right:10,
                    top:0,
                    height:'100%',
                    display:'flex',
                    alignItems:'center',
                    fontWeight:'bold',
                    color:'#388e3c',
                    fontSize:15
                  }}>{`$${item.ganancias.toLocaleString()}`}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Estadisticas;
