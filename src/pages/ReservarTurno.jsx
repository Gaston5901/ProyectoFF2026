
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviciosAPI, horariosAPI } from '../services/api';

import { useCarrito } from '../store/useCarritoStore';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Check, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import { toast } from 'react-toastify';
import { esHorarioVencido } from '../helpers/turnoTiempo';
import './ReservarTurno.css';




const ITEMS_POR_PAGINA_SERVICIOS = 6;
const MAX_PAGE_BUTTONS = 10;

const ReservarTurno = () => {
  const fechaInicioRef = useRef(null);
  const resumenRef = useRef(null);
  const horaInicioRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agregarAlCarrito } = useCarrito();
  
  const [servicios, setServicios] = useState([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [estadoHorarios, setEstadoHorarios] = useState({ todos: [], ocupados: [], disponibles: [] });
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [errorHorarios, setErrorHorarios] = useState('');
  const [loading, setLoading] = useState(true);
  const [paso, setPaso] = useState(1);
  const isGuest = !user;
  const [slowConnection, setSlowConnection] = useState(false);
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [paginaServicios, setPaginaServicios] = useState(1);
  const [ahoraTick, setAhoraTick] = useState(Date.now());

  useEffect(() => {
    cargarServicios();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setAhoraTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      setSlowConnection(false);
      return;
    }
    const timer = setTimeout(() => {
      setSlowConnection(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [loading]);


  useEffect(() => {
    if (fechaSeleccionada) cargarEstadoHorarios(fechaSeleccionada);
  }, [fechaSeleccionada]);

  const cargarServicios = async () => {
    try {
      const response = await serviciosAPI.getAll();
      setServicios(response.data);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const serviciosOrdenados = useMemo(() => {
    const list = Array.isArray(servicios) ? [...servicios] : [];
    list.sort((a, b) => String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' }));
    return list;
  }, [servicios]);

  const serviciosFiltrados = useMemo(() => {
    const list = serviciosOrdenados;
    if (filtroServicio === 'todos') return list;
    return list.filter((s) => String(s?.id || s?._id) === String(filtroServicio));
  }, [serviciosOrdenados, filtroServicio]);

  const ahora = useMemo(() => new Date(ahoraTick), [ahoraTick]);

  const horariosExpirados = useMemo(() => {
    if (!fechaSeleccionada || !estadoHorarios.todos.length) return [];
    return estadoHorarios.todos.filter((hora) => esHorarioVencido(fechaSeleccionada, hora, ahora));
  }, [fechaSeleccionada, estadoHorarios.todos, ahora]);

  const horariosDisponiblesActivos = useMemo(() => {
    const ocupadosSet = new Set(estadoHorarios.ocupados);
    const expiradosSet = new Set(horariosExpirados);
    return estadoHorarios.todos.filter((hora) => !ocupadosSet.has(hora) && !expiradosSet.has(hora));
  }, [estadoHorarios.todos, estadoHorarios.ocupados, horariosExpirados]);

  useEffect(() => {
    if (horaSeleccionada && !horariosDisponiblesActivos.includes(horaSeleccionada)) {
      setHoraSeleccionada('');
    }
  }, [horaSeleccionada, horariosDisponiblesActivos]);

  useEffect(() => {
    setPaginaServicios(1);
  }, [filtroServicio]);

  const totalPaginasServicios = Math.max(1, Math.ceil(serviciosFiltrados.length / ITEMS_POR_PAGINA_SERVICIOS));
  const startServicios = (paginaServicios - 1) * ITEMS_POR_PAGINA_SERVICIOS;
  const endServicios = startServicios + ITEMS_POR_PAGINA_SERVICIOS;
  const serviciosPaginados = serviciosFiltrados.slice(startServicios, endServicios);
  const showPagerServicios = serviciosFiltrados.length > ITEMS_POR_PAGINA_SERVICIOS;

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  };

  const goToPageServicios = (nextPage) => {
    const bounded = Math.min(totalPaginasServicios, Math.max(1, Number(nextPage) || 1));
    setPaginaServicios(bounded);
    scrollToTop();
  };

  const pagesToShowServicios = useMemo(() => {
    const blockStart = Math.floor((paginaServicios - 1) / MAX_PAGE_BUTTONS) * MAX_PAGE_BUTTONS + 1;
    const blockEnd = Math.min(totalPaginasServicios, blockStart + MAX_PAGE_BUTTONS - 1);
    return Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i);
  }, [paginaServicios, totalPaginasServicios]);

  const blockStartServicios = pagesToShowServicios[0] || 1;
  const blockEndServicios = pagesToShowServicios[pagesToShowServicios.length - 1] || 1;

  const renderPagerServicios = (ariaLabel) => (
    <div className="reserva-servicios-pager" aria-label={ariaLabel}>
      <button
        type="button"
        className="reserva-page-btn"
        onClick={() => goToPageServicios(paginaServicios - 1)}
        disabled={paginaServicios === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="reserva-page-numbers" role="group" aria-label="Páginas">
        {blockStartServicios > 1 && <span className="reserva-page-ellipsis">…</span>}
        {pagesToShowServicios.map((p) => (
          <button
            key={p}
            type="button"
            className={`reserva-page-number-btn${p === paginaServicios ? ' is-active' : ''}`}
            onClick={() => goToPageServicios(p)}
            aria-current={p === paginaServicios ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        {blockEndServicios < totalPaginasServicios && <span className="reserva-page-ellipsis">…</span>}
      </div>

      <button
        type="button"
        className="reserva-page-btn"
        onClick={() => goToPageServicios(paginaServicios + 1)}
        disabled={paginaServicios === totalPaginasServicios}
        aria-label="Página siguiente"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );

  const cargarEstadoHorarios = async (fecha) => {
    setLoadingHorarios(true);
    setErrorHorarios('');
    try {
      const resp = await horariosAPI.getPorDia();
      const horariosPorDia = resp.data || {};

      const day = new Date(fecha + 'T00:00:00').getDay();
      const normales = Array.isArray(horariosPorDia[String(day)]) ? horariosPorDia[String(day)] : [];
      const extras = Array.isArray(horariosPorDia[fecha]) ? horariosPorDia[fecha] : [];

      // Logs de depuración
      console.log('Día de la semana:', day);
      console.log('Horarios normales:', normales);
      console.log('Horarios extras:', extras);

      if (normales.length === 0) {
        console.warn('No hay horarios normales configurados para este día de la semana (' + day + '). Verifica tu db.json.');
      }

      const limpiarHora = h => String(h).trim().padStart(5, '0');
      const todos = Array.from(new Set([...normales, ...extras].map(limpiarHora))).sort((a, b) => {
        const [ah, am] = a.split(':').map(Number);
        const [bh, bm] = b.split(':').map(Number);
        return ah !== bh ? ah - bh : am - bm;
      });

      // Usar el servicio turnosAPI para obtener los turnos
      const turnosResp = await import('../services/api').then(mod => mod.turnosAPI.getAll());
      const turnos = turnosResp.data || [];
      // Bloquear horarios de turnos en_proceso, pendiente y confirmado (excepto rechazados)
      const ocupados = turnos
        .filter(t => t.fecha === fecha && (
          (["pendiente", "confirmado"].includes(t.estado) && t.estadoTransferencia !== 'rechazado') ||
          (t.estado === 'en_proceso' && t.estadoTransferencia !== 'rechazado')
        ))
        .map(t => t.hora);

      setEstadoHorarios({
        todos,
        ocupados,
        disponibles: todos.filter(h => !ocupados.includes(h)),
        turnos: turnos.filter(t => t.fecha === fecha && (
          (["pendiente", "confirmado", "en_proceso"].includes(t.estado) && t.estadoTransferencia !== 'rechazado')
        ))
      });
    } catch (error) {
      console.error('Error al cargar horarios:', error);
      setEstadoHorarios({ todos: [], ocupados: [], disponibles: [] });
      setErrorHorarios('No se pudieron cargar los horarios. Intentá nuevamente.');
    } finally {
      setLoadingHorarios(false);
    }
  };

  const seleccionarServicio = (servicio) => {
    if (isGuest) return;
    setServicioSeleccionado(servicio);
    setPaso(2);
    setTimeout(() => {
      if (fechaInicioRef.current) {
        const y = fechaInicioRef.current.getBoundingClientRect().top + window.scrollY - 320;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 200);
  };

  const seleccionarFecha = (fecha) => {
    if (isGuest) return;
    setFechaSeleccionada(fecha);
    setHoraSeleccionada('');
    setEstadoHorarios({ todos: [], ocupados: [], disponibles: [] });
    setErrorHorarios('');
    setPaso(3);
    setTimeout(() => {
      if (horaInicioRef.current) {
        const y = horaInicioRef.current.getBoundingClientRect().top + window.scrollY - 320;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 200);
  };

  const seleccionarHora = (hora, ocupado = false) => {
    if (isGuest) return;
    if (horariosExpirados.includes(hora)) {
      toast.error('Ese horario ya expiró');
      return;
    }
    if (ocupado) {
      toast.error('Ese horario ya está reservado');
      return;
    }

    setHoraSeleccionada(hora);
    setTimeout(() => {
  if (resumenRef.current) {
    const y = resumenRef.current.getBoundingClientRect().top + window.scrollY - 80; // Cambia 120 por el espacio que quieras
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}, 200);
  
  };

  const buscarProximoDisponible = async () => {
    let base = new Date(fechaSeleccionada + 'T00:00:00');

    for (let i = 1; i <= 30; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      if (d.getDay() === 0) continue;

      const fechaStr = format(d, 'yyyy-MM-dd');
      const estado = await horariosAPI.getEstadoDia(fechaStr);

      if (estado.disponibles.length > 0) {
        setFechaSeleccionada(fechaStr);
        setEstadoHorarios(estado);
        setHoraSeleccionada(estado.disponibles[0]);

        toast.success(`Próximo disponible: ${format(d, 'dd/MM')} ${estado.disponibles[0]} hs`);
        return;
      }
    }

    toast.warn('No se encontró un horario disponible en los próximos días');
  };

  const agregarAlCarritoYContinuar = () => {
    if (isGuest) return;
    if (!horaSeleccionada || !horariosDisponiblesActivos.includes(horaSeleccionada)) {
      toast.error('El horario seleccionado ya no está disponible');
      return;
    }
    // Si está logueado, flujo normal
    agregarAlCarrito(servicioSeleccionado, fechaSeleccionada, horaSeleccionada);
    navigate('/carrito', { state: { scrollToResumen: true } });
  };

  const generarFechasDisponibles = () => {
    const fechas = [];
    const hoy = startOfToday();

    for (let i = 0; i < 14; i++) {
      const fecha = addDays(hoy, i);
      if (fecha.getDay() !== 0) fechas.push(fecha);
    }

    return fechas;
  };

  if (loading)
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="spinner"></div>
        <p>Cargando...</p>
        {slowConnection && (
          <p style={{ marginTop: 10, color: '#d13fa0', fontWeight: 600 }}>
            Conexión lenta. Esto puede demorar un poco.
          </p>
        )}
      </div>
    );

  return (
    <div className="reservar-page">
      {isGuest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,10,10,0.35)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(2px)'
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: '100%',
              background: '#fff',
              borderRadius: 18,
              padding: '20px 22px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ margin: 0, color: '#d13fa0' }}>Iniciá sesión</h3>
            <p style={{ margin: '10px 0 16px', color: '#444' }}>
              Para reservar un turno necesitás tener una cuenta.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
            >
              Ir a iniciar sesión
            </button>
          </div>
        </div>
      )}
      <div className="reservar-header">
        <h1>
          <span className="header-icon">
            <Calendar size={28} />
          </span>
          Reservar Turno
        </h1>
        <p>Seleccioná servicio, fecha y horario</p>
      </div>

      <div className="container">
        {/* PASOS */}
        <div className="progress-steps">
          <div className={`step ${paso >= 1 ? 'active' : ''} ${paso > 1 ? 'completed' : ''}`}>
            <div className="step-number">{paso > 1 ? <Check size={20} /> : '1'}</div>
            <span>Servicio</span>
          </div>
          <div className={`step ${paso >= 2 ? 'active' : ''} ${paso > 2 ? 'completed' : ''}`}>
            <div className="step-number">{paso > 2 ? <Check size={20} /> : '2'}</div>
            <span>Fecha</span>
          </div>
          <div className={`step ${paso >= 3 ? 'active' : ''} ${paso > 3 ? 'completed' : ''}`}>
            <div className="step-number">{paso > 3 ? <Check size={20} /> : '3'}</div>
            <span>Horario</span>
          </div>
        </div>

        {/* PASO 1 – SERVICIOS */}
        {paso === 1 && (
          <div className="paso-container">
            <h2 className="paso-title">
              <Calendar size={28} />
              Seleccioná el servicio
            </h2>

            <div className="reserva-servicios-toolbar" aria-label="Filtro de servicios">
              <div className="reserva-servicios-filtros" aria-label="Filtro por servicio">
                <span className="reserva-servicios-filtros-icon" aria-hidden="true">
                  <Filter size={16} />
                </span>
                <select
                  className="reserva-servicios-select"
                  value={filtroServicio}
                  onChange={(e) => setFiltroServicio(e.target.value)}
                  aria-label="Filtrar por servicio"
                >
                  <option value="todos">Filtro</option>
                  {serviciosOrdenados.map((s, idx) => (
                    <option key={s?.id || s?._id || idx} value={s?.id || s?._id}>
                      {s?.nombre || 'Servicio'}
                    </option>
                  ))}
                </select>
              </div>

              {showPagerServicios && renderPagerServicios('Paginación servicios')}
            </div>

            <div className="servicios-grid-reserva">
              {serviciosPaginados.map((servicio) => (
                <div
                  key={servicio.id || servicio._id}
                  className="servicio-card-reserva"
                  onClick={() => seleccionarServicio(servicio)}
                >
                  <h3>{servicio.nombre}</h3>
                  <p>{servicio.descripcion}</p>
                  <div className="servicio-info-reserva">
                    <span className="precio">${servicio.precio.toLocaleString()}</span>
                    <span className="duracion">
                      <Clock size={16} />
                      {servicio.duracion} min
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {showPagerServicios && (
              <div className="reserva-servicios-bottom-pager">
                {renderPagerServicios('Paginación servicios (abajo)')}
              </div>
            )}
          </div>
        )}

        {/* PASO 2 – FECHAS */}
        {paso === 2 && servicioSeleccionado && (
          <div className="paso-container" ref={fechaInicioRef}>
            <h2 className="paso-title">
              <Calendar size={28} />
              Seleccioná la fecha
            </h2>

            <div className="servicio-seleccionado-info">
              <p>
                Servicio: <strong>{servicioSeleccionado.nombre}</strong>
              </p>
              <button className="btn btn-secondary" onClick={() => setPaso(1)}>
                Cambiar servicio
              </button>
            </div>

            <div className="fechas-grid">
              {generarFechasDisponibles().map((fecha) => {
                const fechaStr = format(fecha, 'yyyy-MM-dd');
                const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

                return (
                  <div
                    key={fechaStr}
                    className={`fecha-card ${fechaSeleccionada === fechaStr ? 'selected' : ''}`}
                    onClick={() => seleccionarFecha(fechaStr)}
                  >
                    <div className="fecha-dia">{dias[fecha.getDay()]}</div>
                    <div className="fecha-numero">{fecha.getDate()}</div>
                    <div className="fecha-mes">{meses[fecha.getMonth()]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PASO 3 – HORARIOS */}
        {paso === 3 && servicioSeleccionado && (
          <div className="paso-container" ref={horaInicioRef}>
            <h2 className="paso-title">
              <Clock size={28} />
              Seleccioná el horario
            </h2>

            <div className="servicio-seleccionado-info">
              <p>
                Servicio: <strong>{servicioSeleccionado.nombre}</strong> | Fecha:{' '}
                <strong>{format(new Date(fechaSeleccionada + 'T00:00:00'), 'dd/MM/yyyy')}</strong>
              </p>
              <button className="btn btn-secondary" onClick={() => setPaso(2)}>
                Cambiar fecha
              </button>
            </div>

            {loadingHorarios ? (
              <div className="no-horarios" style={{ alignItems: 'center' }}>
                <div className="spinner"></div>
                <p>Cargando horarios...</p>
              </div>
            ) : errorHorarios ? (
              <div className="no-horarios">
                <p>{errorHorarios}</p>
                <button className="btn btn-secondary" onClick={() => cargarEstadoHorarios(fechaSeleccionada)}>
                  Reintentar
                </button>
              </div>
            ) : estadoHorarios.todos.length > 0 ? (
              <>
                <div className="horarios-grid">
                  {estadoHorarios.todos.map((hora) => {
                    // Buscar el turno que ocupa ese horario
                    const turnoOcupado = (estadoHorarios.turnos || []).find(t => t.hora === hora);
                    let badge = null;
                    let ocupado = false;
                    let enproceso = false;
                    const expirado = horariosExpirados.includes(hora);
                    if (turnoOcupado) {
                      if (["pendiente", "confirmado"].includes(turnoOcupado.estado) && turnoOcupado.estadoTransferencia !== 'rechazado') {
                        badge = <span className="tag-reservado">Reservado</span>;
                        ocupado = true;
                      } else if (turnoOcupado.estado === 'en_proceso' && turnoOcupado.estadoTransferencia !== 'rechazado') {
                        badge = <span className="tag-enproceso">En proceso</span>;
                        ocupado = true;
                        enproceso = true;
                      }
                    }
                    return (
                      <div
                        key={hora}
                        className={`hora-card ${horaSeleccionada === hora ? 'selected' : ''} ${ocupado ? 'ocupado' : ''} ${enproceso ? 'enproceso' : ''} ${expirado ? 'expirado' : ''}`}
                        onClick={ocupado || expirado ? undefined : () => seleccionarHora(hora, false)}
                        style={ocupado || expirado ? { pointerEvents: 'none', cursor: 'not-allowed', opacity: 1 } : {}}
                        aria-disabled={ocupado || expirado}
                        tabIndex={ocupado || expirado ? -1 : 0}
                      >
                        <Clock size={20} />
                        <span className={ocupado || expirado ? 'hora-text' : ''}>{hora} hs</span> {badge || (expirado ? <span className="tag-expirado">Expirado</span> : null)}
                      </div>
                    );
                  })}
                </div>

                {horariosDisponiblesActivos.length === 0 && (
                  <div className="no-horarios">
                    <p>{horariosExpirados.length === estadoHorarios.todos.length && estadoHorarios.todos.length > 0 ? 'Los horarios de este día ya expiraron.' : 'Todos los horarios de este día están reservados.'}</p>
                    <button className="btn btn-primary" onClick={buscarProximoDisponible}>
                      Ir al próximo disponible
                    </button>
                  </div>
                )}

                {horaSeleccionada && horariosDisponiblesActivos.includes(horaSeleccionada) && (
                  <div className="resumen-reserva" ref={resumenRef}>
                    <h3>Resumen de tu reserva</h3>

                    <div className="resumen-item">
                      <span>Servicio:</span>
                      <strong>{servicioSeleccionado.nombre}</strong>
                    </div>

                    <div className="resumen-item">
                      <span>Fecha:</span>
                      <strong>
                        {format(new Date(fechaSeleccionada + 'T00:00:00'), 'dd/MM/yyyy')}
                      </strong>
                    </div>

                    <div className="resumen-item">
                      <span>Horario:</span>
                      <strong>{horaSeleccionada} hs</strong>
                    </div>

                    <div className="resumen-item">
                      <span>Precio total:</span>
                      <strong>${servicioSeleccionado.precio.toLocaleString()}</strong>
                    </div>

                    <div className="resumen-item resumen-seña">
                      <span>Seña (50%):</span>
                      <strong className="precio-seña">
                        ${(servicioSeleccionado.precio / 2).toLocaleString()}
                      </strong>
                    </div>

                    <div className="anuncio-local">Dirección: Barrio San Martín mza A casa 5</div>

                    <button className="btn btn-primary btn-reservar" onClick={agregarAlCarritoYContinuar}>
                      Continuar al pago (carrito)
                    </button>

                  </div>
                )}
              </>
            ) : (
              <div className="no-horarios">
                <p>Este día no tiene horarios configurados.</p>
                <button className="btn btn-secondary" onClick={() => setPaso(2)}>
                  Elegir otra fecha
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservarTurno;
