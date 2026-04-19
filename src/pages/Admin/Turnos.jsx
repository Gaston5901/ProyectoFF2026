import { useState, useEffect, useMemo, useRef } from 'react';
import { turnosAPI, serviciosAPI, horariosAPI, usuariosAPI } from '../../services/api';
import { Calendar, Plus, Search, ChevronLeft, ChevronRight, Pencil, ChevronDown, Wrench, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import HorarioSelectorAdmin from './HorarioSelectorAdmin';
import { toast } from 'react-toastify';
import './Admin.css';

const Turnos = () => {
  // Estado para modal de edición
  const [editando, setEditando] = useState(false);
  const handleEditarTurno = (turno) => {
    // Prepara el objeto editable con los datos del turno y del usuario
    const usuario = usuarios[turno.usuarioId] || {};
    setTurnoEditar({
  
      ...turno,
      nombre: usuario.nombre || turno.nombre || '',
      telefono: usuario.telefono || turno.telefono || '',
      email: usuario.email || turno.email || '',
      rol: usuario.rol || 'cliente',
    });
    setEditando(true);
  };
  const cerrarModalEditar = () => {
    setTurnoEditar(null);
    setEditando(false);
  };

  // Reprogramación (separado de editar)
  const [reprogramando, setReprogramando] = useState(false);
  const [turnoReprogramar, setTurnoReprogramar] = useState(null);
  const [reprog, setReprog] = useState({ fecha: '', hora: '' });
  const [guardandoReprog, setGuardandoReprog] = useState(false);

  const abrirReprogramar = (turno) => {
    setTurnoReprogramar(turno);
    setReprog({ fecha: '', hora: '' });
    setReprogramando(true);
  };

  const cerrarReprogramar = () => {
    setTurnoReprogramar(null);
    setReprog({ fecha: '', hora: '' });
    setReprogramando(false);
  };

  const confirmarReprogramacion = async () => {
    if (!turnoReprogramar || !reprog.fecha || !reprog.hora) return;
    if (guardandoReprog) return;
    setGuardandoReprog(true);
    try {
      await turnosAPI.update(turnoReprogramar.id, {
        servicio: turnoReprogramar.servicioId,
        fecha: reprog.fecha,
        hora: reprog.hora,
        email: turnoReprogramar.email,
        nombre: turnoReprogramar.nombre,
        telefono: turnoReprogramar.telefono,
      });
      toast.success('Turno reprogramado correctamente');
      cerrarReprogramar();
      await cargarDatos();
    } catch (error) {
      const msg = error?.response?.data?.mensaje || 'Error al reprogramar el turno';
      toast.error(msg);
      console.error(error);
    } finally {
      setGuardandoReprog(false);
    }
  };

  // Guardar cambios de edición
  const guardarEdicionTurno = async (e) => {
    e.preventDefault();
    if (guardandoEdicion) return;
    setGuardandoEdicion(true);
    try {
      // Actualiza turno con todos los datos relevantes
      await turnosAPI.update(turnoEditar.id, {
        servicio: turnoEditar.servicioId,
        fecha: turnoEditar.fecha,
        hora: turnoEditar.hora,
        email: turnoEditar.email,
        nombre: turnoEditar.nombre,
        telefono: turnoEditar.telefono,
      });
      toast.success('Turno editado correctamente');
      cerrarModalEditar();
      await cargarDatos(); // Espera la recarga para asegurar que se actualice la vista
    } catch (error) {
      toast.error('Error al editar el turno');
      console.error(error);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // --- ESTADO Y FUNCIONES PARA MODAL HORARIOS EXTRAS ---
  const [mostrarHorariosExtras, setMostrarHorariosExtras] = useState(false);
  const [fechaHorariosExtras, setFechaHorariosExtras] = useState('');
  const [horariosExtras, setHorariosExtras] = useState([]);
  const [nuevoHorario, setNuevoHorario] = useState('');
  const [editandoHorario, setEditandoHorario] = useState(null);

  // Cargar horarios extras para la fecha seleccionada
  const cargarHorariosExtras = async (fecha) => {
    try {
      const resp = await horariosAPI.getPorDia();
      let horarios = [];
      if (resp.data && resp.data[fecha]) {
        horarios = resp.data[fecha];
      } else if (resp.data) {
        // Si no hay horarios específicos para la fecha, busca por día de la semana
        const day = new Date(fecha + 'T00:00:00').getDay();
        if (resp.data[String(day)]) {
          horarios = resp.data[String(day)];
        }
      }
      setHorariosExtras(Array.isArray(horarios) ? horarios : []);
    } catch (error) {
      setHorariosExtras([]);
    }
  };

  // Estado loading para guardar horarios extras
  const [guardandoHorariosExtras, setGuardandoHorariosExtras] = useState(false);
  // Guardar horarios extras en la base
  const guardarHorariosExtras = async () => {
    if (!fechaHorariosExtras) {
      toast.error('Selecciona una fecha');
      return;
    }
    setGuardandoHorariosExtras(true);
    try {
      const resp = await horariosAPI.getPorDia();
      // Verifica que el payload sea un objeto con arrays como valores
      const nuevos = { ...resp.data, [fechaHorariosExtras]: Array.isArray(horariosExtras) ? horariosExtras : [] };
      const resUpdate = await horariosAPI.setPorDia(nuevos);
      if (resUpdate?.error) {
        toast.error('Error: ' + (resUpdate.error.message || JSON.stringify(resUpdate.error)));
      } else {
        toast.success('Horarios extras guardados');
        setMostrarHorariosExtras(false);
        cargarHorariosExtras(fechaHorariosExtras);
      }
    } catch (error) {
      toast.error('Error al guardar horarios: ' + (error?.message || JSON.stringify(error)));
      console.error('Error al guardar horarios:', error);
    } finally {
      setGuardandoHorariosExtras(false);
    }
  };
    // Estado para modal de edición
    const [turnoEditar, setTurnoEditar] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [servicios, setServicios] = useState({});
  const [usuarios, setUsuarios] = useState({});
  const [usuariosList, setUsuariosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [turnosPage, setTurnosPage] = useState(1);
  const [pagosOpenId, setPagosOpenId] = useState(null);
  const [mobileMenuOpenId, setMobileMenuOpenId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [creando, setCreando] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [emailComboOpen, setEmailComboOpen] = useState(false);
  const emailComboBlurTimeoutRef = useRef(null);
  const [nuevoTurno, setNuevoTurno] = useState({
    nombre: '',
    telefono: '',
    email: '',
    servicioId: '',
    fecha: '',
    hora: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    setTurnosPage(1);
    setPagosOpenId(null);
  }, [filtro, busqueda]);

  const cargarDatos = async () => {
    try {
      const [turnosRes, serviciosRes, usuariosRes] = await Promise.all([
        turnosAPI.getAll(),
        serviciosAPI.getAll(),
        usuariosAPI.getAll().catch(() => ({ data: [] })),
      ]);
      const serviciosMap = {};
      serviciosRes.data.forEach((s) => {
        serviciosMap[s.id] = s;
      });

      const usuariosArr = Array.isArray(usuariosRes?.data) ? usuariosRes.data : [];
      const usuariosMap = {};
      usuariosArr.forEach((u) => {
        if (u?.id != null) usuariosMap[u.id] = u;
      });

      setServicios(serviciosMap);
      setUsuarios(usuariosMap);
      setUsuariosList(
        usuariosArr
          .filter((u) => typeof u?.email === 'string' && u.email.trim() !== '')
          .filter((u) => {
            const rol = String(u?.rol || '').toLowerCase();
            return rol !== 'admin' && rol !== 'superadmin';
          })
          .map((u) => ({
            email: u.email.trim(),
            nombre: typeof u?.nombre === 'string' ? u.nombre : '',
            telefono: typeof u?.telefono === 'string' ? u.telefono : '',
          }))
          .filter((u, index, self) => self.findIndex((x) => x.email.toLowerCase() === u.email.toLowerCase()) === index)
          .sort((a, b) => a.email.localeCompare(b.email))
      );
      setTurnos(turnosRes.data.sort((a, b) => {
        if (a.fecha === b.fecha) {
          return a.hora.localeCompare(b.hora);
        }
        return b.fecha.localeCompare(a.fecha);
      }));
    } catch (error) {
      toast.error('Error al cargar los datos de turnos');
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const usuariosEmailFiltrados = useMemo(() => {
    if (!Array.isArray(usuariosList) || usuariosList.length === 0) return [];
    const q = String(nuevoTurno.email || '').trim().toLowerCase();
    const base = q
      ? usuariosList.filter((u) => u.email.toLowerCase().includes(q))
      : usuariosList;
    return base.slice(0, 10);
  }, [usuariosList, nuevoTurno.email]);

  const seleccionarEmailExistente = (u) => {
    setNuevoTurno((prev) => ({
      ...prev,
      email: u.email,
      nombre: prev.nombre?.trim() ? prev.nombre : (u.nombre || ''),
      telefono: prev.telefono?.trim() ? prev.telefono : (u.telefono || ''),
    }));
    setEmailComboOpen(false);
  };

  const crearTurnoPresencial = async (e) => {
    e.preventDefault();
    if (creando) return;
    setCreando(true);
    try {
      const servicio = servicios[nuevoTurno.servicioId];
      const montoSeña = Math.round(servicio.precio * 0.5);
      const turnoData = {
        servicio: servicio.id || servicio._id, // Mongo espera 'servicio' como ObjectId
        fecha: nuevoTurno.fecha,
        hora: nuevoTurno.hora,
        estado: 'confirmado',
        pagoId: 'PRESENCIAL' + Date.now(),
        montoPagado: montoSeña,
        montoTotal: servicio.precio,
        createdAt: new Date().toISOString(),
        email: nuevoTurno.email?.trim() || '',
        nombre: nuevoTurno.nombre?.trim() || '',
        telefono: nuevoTurno.telefono?.trim() || '',
        // Si el usuario no existe, el backend lo crea y usa esta clave como password inicial
        passwordGenerada: 'temporal123'
      };
      await turnosAPI.create(turnoData);
      // ENVÍO DE EMAILS eliminado para evitar errores 404
      toast.success('Turno creado exitosamente con seña pagada');
      setMostrarFormulario(false);
      setNuevoTurno({
        nombre: '',
        telefono: '',
        email: '',
        servicioId: '',
        fecha: '',
        hora: '',
      });
      cargarDatos();
    } catch (error) {
      toast.error('Error al crear el turno');
      console.error(error);
    } finally {
      setCreando(false);
    }
  };

  // Declaraciones fuera de cualquier función/render
  const hoyStr = format(new Date(), 'yyyy-MM-dd');
  const turnosFiltrados = turnos
  .filter((turno) => {
    // Filtrar turnos rechazados
    if (turno.estado === 'rechazado') return false;
    let esValido = false;
    if (filtro === 'todos') {
      esValido = turno.fecha >= hoyStr && turno.estado !== 'completado';
    } else if (filtro === 'hoy') {
      esValido = turno.fecha === hoyStr && turno.estado !== 'completado';
    }

    const q = String(busqueda || '').trim().toLowerCase();
    const isNumericQuery = /^\d+$/.test(q);

    const turnoIdStr = String(turno?.id ?? '');
    const pagoIdStr = String(turno?.pagoId ?? '').toLowerCase();
    const idMatchExact = turnoIdStr === q || pagoIdStr === q;

    const servicioNombreNorm = String(servicios[turno.servicioId]?.nombre || '').toLowerCase();
    const servicioTokens = servicioNombreNorm
      .split(/[\s/.,;:_\-]+/)
      .filter(Boolean);
    const qTokens = q.split(/\s+/).filter(Boolean);
    const servicioMatch = qTokens.length === 0
      ? true
      : qTokens.every((qt) => servicioTokens.some((st) => st.startsWith(qt)));

    const cumpleBusqueda =
      q === '' ||
      (isNumericQuery
        ? idMatchExact
        : (
          servicioMatch ||
          String(usuarios[turno.usuarioId]?.nombre || turno.nombre || '').toLowerCase().includes(q) ||
          String(turno.pagoId || turno.id || '').toLowerCase().includes(q)
        ));
    return esValido && cumpleBusqueda;
  })
  .sort((a, b) => {
    if (a.fecha === b.fecha) return (a.hora || '').localeCompare(b.hora || '');
    return (a.fecha || '').localeCompare(b.fecha || '');
  });

  const turnosPerPage = 6;
  const turnosTotal = turnosFiltrados.length;
  const turnosTotalPages = Math.max(1, Math.ceil(turnosTotal / turnosPerPage));

  useEffect(() => {
    setTurnosPage((p) => Math.min(p, turnosTotalPages));
  }, [turnosTotalPages]);

  const turnosStart = (turnosPage - 1) * turnosPerPage;
  const turnosEnd = turnosStart + turnosPerPage;
  const turnosPaginados = turnosFiltrados.slice(turnosStart, turnosEnd);
  const mostrandoDesde = turnosTotal === 0 ? 0 : turnosStart + 1;
  const mostrandoHasta = Math.min(turnosEnd, turnosTotal);

  const mobileMenuTurno = useMemo(() => {
    if (!mobileMenuOpenId) return null;
    return turnos.find((t) => t.id === mobileMenuOpenId) || null;
  }, [mobileMenuOpenId, turnos]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="spinner"></div>
        <p>Cargando turnos...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>
          <Calendar size={40} />
          Gestión de Turnos
        </h1>
        <p>Administrá y controlá todos los turnos</p>
      </div>

      <div className="container">
        <div className="turnos-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Buscar por servicio, cliente o ID pago..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="filtros">
            <>
                <button
                  className="btn-horarios-extras"
                  onClick={() => setMostrarHorariosExtras(true)}
                  style={{
                    marginLeft: '18px',
                    background: 'linear-gradient(90deg, #d13fa0 0%, #ff5ec4 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 24px',
                    fontWeight: 'bold',
                    fontSize: '1.08rem',
                    boxShadow: '0 4px 18px rgba(209,63,160,0.18)',
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                    transition: 'all 0.18s',
                    outline: 'none',
                    opacity: 1,
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'linear-gradient(90deg, #ff5ec4 0%, #d13fa0 100%)';
                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(209,63,160,0.25)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'linear-gradient(90deg, #d13fa0 0%, #ff5ec4 100%)';
                    e.currentTarget.style.boxShadow = '0 4px 18px rgba(209,63,160,0.18)';
                  }}
                >
                  <span style={{marginRight:'8px',fontWeight:'bold',fontSize:'1.1em'}}>+</span>Agregar horarios extras
                </button>
              <button
                className={`filtro-btn ${filtro === 'todos' ? 'active' : ''}`}
                onClick={() => setFiltro('todos')}
              >
                Todos
              </button>
              <button
                className={`filtro-btn ${filtro === 'hoy' ? 'active' : ''}`}
                onClick={() => setFiltro('hoy')}
              >
                Hoy
              </button>
              {/* Modal de horarios extras */}
              {mostrarHorariosExtras && (
                <div className="modal-horarios-extras-bg" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={() => setMostrarHorariosExtras(false)}>
                  <div className="modal-horarios-extras" style={{background:'#fff',borderRadius:'22px',boxShadow:'0 8px 40px rgba(180,0,90,0.18)',padding:'0',minWidth:'340px',maxWidth:'95vw',width:'420px',animation:'modalScaleIn .4s',position:'relative',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e => e.stopPropagation()}>
                    <button style={{position:'absolute',top:18,right:18,background:'none',border:'none',fontSize:'1.3rem',color:'#d13fa0',cursor:'pointer',zIndex:2}} onClick={() => setMostrarHorariosExtras(false)} title="Cerrar">×</button>
                    <div style={{padding:'38px 38px 0 38px',overflowY:'auto',flex:'1 1 auto'}}>
                      <h3 style={{marginBottom:'22px',fontWeight:'bold',fontSize:'1.25rem',color:'#d13fa0'}}>Gestionar horarios extras</h3>
                      <label style={{fontWeight:'bold',color:'#222'}}>Fecha especial</label>
                      <input type="date" value={fechaHorariosExtras} onChange={e => {setFechaHorariosExtras(e.target.value); cargarHorariosExtras(e.target.value);}} style={{marginBottom:'18px',padding:'8px',borderRadius:'8px',border:'1.5px solid #d13fa0',fontSize:'1rem',color:'#222'}} />
                      {fechaHorariosExtras && (
                        <>
                          <div style={{marginBottom:'12px'}}>
                            <label style={{fontWeight:'bold',color:'#222'}}>Horarios para {fechaHorariosExtras}:</label>
                            <ul style={{listStyle:'none',padding:0}}>
                              {horariosExtras.map((h,i) => (
                                <li key={i} style={{display:'flex',alignItems:'center',marginBottom:'6px'}}>
                                  {editandoHorario === i ? (
                                    <input type="text" value={nuevoHorario} onChange={e => setNuevoHorario(e.target.value)} style={{padding:'4px',borderRadius:'6px',border:'1px solid #d13fa0',marginRight:'8px',width:'90px'}} />
                                  ) : (
                                    <span style={{fontWeight:'bold',color:'#d13fa0',marginRight:'8px'}}>{h}</span>
                                  )}
                                  {editandoHorario === i ? (
                                    <>
                                      <button style={{background:'#d13fa0',color:'#fff',border:'none',borderRadius:'6px',padding:'2px 8px',marginRight:'4px'}} onClick={() => {const arr=[...horariosExtras];arr[i]=nuevoHorario;setHorariosExtras(arr);setEditandoHorario(null);}}>Guardar</button>
                                      <button style={{background:'#eee',color:'#d13fa0',border:'none',borderRadius:'6px',padding:'2px 8px'}} onClick={() => setEditandoHorario(null)}>Cancelar</button>
                                    </>
                                  ) : (
                                    <>
                                      <button style={{background:'#e7b2e6',color:'#fff',border:'none',borderRadius:'6px',padding:'2px 8px',marginRight:'4px'}} onClick={() => {setEditandoHorario(i);setNuevoHorario(h);}}>Editar</button>
                                      <button style={{background:'#fff',color:'#d13fa0',border:'1px solid #d13fa0',borderRadius:'6px',padding:'2px 8px'}} onClick={() => {const arr=[...horariosExtras];arr.splice(i,1);setHorariosExtras(arr);}}>Eliminar</button>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div style={{display:'flex',alignItems:'center',marginBottom:'18px'}}>
                            <input type="text" value={nuevoHorario} onChange={e => setNuevoHorario(e.target.value)} placeholder="Nuevo horario (ej: 18:00)" style={{padding:'4px',borderRadius:'6px',border:'1px solid #d13fa0',marginRight:'8px',width:'90px'}} />
                            <button style={{background:'#d13fa0',color:'#fff',border:'none',borderRadius:'6px',padding:'2px 12px',fontWeight:'bold'}} onClick={() => {if(nuevoHorario){setHorariosExtras([...horariosExtras,nuevoHorario]);setNuevoHorario('');}}}>Agregar</button>
                          </div>
                          <div style={{display:'flex',justifyContent:'flex-end',gap:'12px',marginBottom:'18px'}}>
                            <button style={{background:'#fff',color:'#d13fa0',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'8px 22px',fontWeight:'bold',fontSize:'1rem'}} onClick={() => setMostrarHorariosExtras(false)} disabled={guardandoHorariosExtras}>Cancelar</button>
                            <button style={{background:'linear-gradient(90deg,#d13fa0,#e7b2e6)',color:'#fff',border:'none',borderRadius:'8px',padding:'8px 22px',fontWeight:'bold',fontSize:'1rem',opacity:guardandoHorariosExtras?0.7:1,cursor:guardandoHorariosExtras?'not-allowed':'pointer'}} onClick={guardarHorariosExtras} disabled={!fechaHorariosExtras||guardandoHorariosExtras}>
                              {guardandoHorariosExtras ? (
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{marginRight:8}}></span>
                              ) : null}
                              Guardar cambios
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
          >
            <Plus size={20} />
            Nuevo Turno Presencial
          </button>
        </div>

        {mostrarFormulario && (
          <div className="modal-turno-bg" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,animation:'fadeInBg .4s'}} onClick={() => { setMostrarFormulario(false); setEmailComboOpen(false); setNuevoTurno({ nombre: '', telefono: '', email: '', servicioId: '', fecha: '', hora: '' }); }}>
            <div className="modal-turno" style={{background:'linear-gradient(135deg,#fff 80%,#e7b2e6 100%)',borderRadius:'22px',boxShadow:'0 8px 40px rgba(180,0,90,0.18)',padding:'0',minWidth:'340px',maxWidth:'95vw',width:'520px',animation:'modalScaleIn .4s',position:'relative',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e => e.stopPropagation()}>
              <button style={{position:'absolute',top:18,right:18,background:'none',border:'none',fontSize:'1.3rem',color:'#d13fa0',cursor:'pointer',zIndex:2}} onClick={() => { setMostrarFormulario(false); setEmailComboOpen(false); setNuevoTurno({ nombre: '', telefono: '', email: '', servicioId: '', fecha: '', hora: '' }); }} title="Cerrar">×</button>
              {/* Flujo igual al cliente: servicio, fecha, horario */}
              <div style={{padding:'38px 38px 0 38px',overflowY:'auto',flex:'1 1 auto'}}>
                <h3 style={{marginBottom:'22px',fontWeight:'bold',fontSize:'1.35rem',color:'#d13fa0'}}>Crear Turno Presencial</h3>
                {/* Paso 1: Servicio */}
                {!nuevoTurno.servicioId && (
                  <div>
                    <div style={{display:'flex',alignItems:'center',marginBottom:'10px'}}>
                      <button className="btn btn-secondary" style={{background:'#fff',color:'#d13fa0',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'7px 18px',fontWeight:'bold',fontSize:'1rem',transition:'0.2s',marginRight:'16px'}} onClick={() => setMostrarFormulario(false)}>
                        Cancelar
                      </button>
                      <h4 style={{margin:0}}>Seleccioná el servicio</h4>
                    </div>
                    <div className="servicios-grid-reserva">
                      {Object.values(servicios).map((servicio) => (
                        <div key={servicio.id} className="servicio-card-reserva" onClick={() => setNuevoTurno({ ...nuevoTurno, servicioId: servicio.id })}>
                          <h3>{servicio.nombre}</h3>
                          <p>{servicio.descripcion}</p>
                          <div className="servicio-info-reserva">
                            <span className="precio">${servicio.precio.toLocaleString()}</span>
                            <span className="duracion">{servicio.duracion} min</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Paso 2: Fecha */}
                {nuevoTurno.servicioId && !nuevoTurno.fecha && (
                  <div>
                    <div style={{display:'flex',alignItems:'center',marginBottom:'10px'}}>
                      <button className="btn btn-secondary" style={{background:'#fff',color:'#d13fa0',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'7px 18px',fontWeight:'bold',fontSize:'1rem',transition:'0.2s',marginRight:'16px'}} onClick={() => setNuevoTurno({ ...nuevoTurno, servicioId: '' })}>
                        ← Volver
                      </button>
                      <h4 style={{margin:0}}>Seleccioná la fecha</h4>
                    </div>
                    <div className="fechas-grid">
                      {Array.from({length:14}).map((_,i) => {
                        const hoy = new Date();
                        const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()+i);
                        if (fecha.getDay() === 0) return null;
                        const fechaStr = fecha.toISOString().slice(0,10);
                        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                        return (
                          <div key={fechaStr} className={`fecha-card ${nuevoTurno.fecha === fechaStr ? 'selected' : ''}`} onClick={() => setNuevoTurno({ ...nuevoTurno, fecha: fechaStr })}>
                            <div className="fecha-dia">{dias[fecha.getDay()]}</div>
                            <div className="fecha-numero">{fecha.getDate()}</div>
                            <div className="fecha-mes">{meses[fecha.getMonth()]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Paso 3: Horario */}
                {nuevoTurno.servicioId && nuevoTurno.fecha && !nuevoTurno.hora && (
                  <div>
                    <div style={{display:'flex',alignItems:'center',marginBottom:'10px'}}>
                      <button className="btn btn-secondary" style={{background:'#fff',color:'#d13fa0',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'7px 18px',fontWeight:'bold',fontSize:'1rem',transition:'0.2s',marginRight:'16px'}} onClick={() => setNuevoTurno({ ...nuevoTurno, fecha: '' })}>
                        ← Volver
                      </button>
                      <h4 style={{margin:0}}>Seleccioná el horario</h4>
                    </div>
                    <HorarioSelectorAdmin fecha={nuevoTurno.fecha} onSelect={hora => setNuevoTurno({ ...nuevoTurno, hora })} />
                  </div>
                )}
                {/* Paso 4: Datos cliente y resumen */}
                {nuevoTurno.servicioId && nuevoTurno.fecha && nuevoTurno.hora && (
                  <form onSubmit={crearTurnoPresencial} style={{marginTop:'18px'}}>
                    <div style={{display:'flex',alignItems:'center',marginBottom:'10px'}}>
                      <button type="button" className="btn btn-secondary" style={{background:'#fff',color:'#d13fa0',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'7px 18px',fontWeight:'bold',fontSize:'1rem',transition:'0.2s',marginRight:'16px'}} onClick={() => setNuevoTurno({ ...nuevoTurno, hora: '' })}>
                        ← Volver
                      </button>
                      <h4 style={{margin:0}}>Datos del cliente</h4>
                    </div>
                    <div className="form-grid" style={{gap:'18px'}}>
                      <div className="form-group">
                        <label className="form-label" style={{color:'#222',fontWeight:'bold'}}>Nombre del Cliente</label>
                        <input type="text" className="form-input" style={{background:'#fff',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'10px',fontSize:'1rem',color:'#222'}} value={nuevoTurno.nombre} onChange={e => setNuevoTurno({ ...nuevoTurno, nombre: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{color:'#222',fontWeight:'bold'}}>Teléfono</label>
                        <input type="tel" className="form-input" style={{background:'#fff',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'10px',fontSize:'1rem',color:'#222'}} value={nuevoTurno.telefono} onChange={e => setNuevoTurno({ ...nuevoTurno, telefono: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{color:'#222',fontWeight:'bold'}}>Email</label>
                        <div className="admin-email-combo">
                          <div className="admin-email-combo-inputWrap">
                            <input
                              type="email"
                              className="form-input"
                              style={{background:'#fff',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'10px',fontSize:'1rem',color:'#222'}}
                              value={nuevoTurno.email}
                              onChange={(e) => {
                                setNuevoTurno({ ...nuevoTurno, email: e.target.value });
                                setEmailComboOpen(true);
                              }}
                              onFocus={() => {
                                if (emailComboBlurTimeoutRef.current) {
                                  clearTimeout(emailComboBlurTimeoutRef.current);
                                  emailComboBlurTimeoutRef.current = null;
                                }
                                setEmailComboOpen(true);
                              }}
                              onBlur={() => {
                                emailComboBlurTimeoutRef.current = setTimeout(() => {
                                  setEmailComboOpen(false);
                                }, 140);
                              }}
                              placeholder="Seleccioná un email o escribí uno nuevo"
                              required
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              className="admin-email-combo-toggle"
                              title="Ver sugerencias"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setEmailComboOpen((v) => !v)}
                            >
                              <ChevronDown size={18} />
                            </button>
                          </div>

                          {emailComboOpen && usuariosEmailFiltrados.length > 0 && (
                            <div className="admin-email-combo-dropdown" role="listbox">
                              {usuariosEmailFiltrados.map((u) => (
                                <button
                                  key={u.email}
                                  type="button"
                                  className="admin-email-combo-option"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => seleccionarEmailExistente(u)}
                                >
                                  <span className="admin-email-combo-email">{u.email}</span>
                                  {(u.nombre || u.telefono) ? (
                                    <span className="admin-email-combo-meta">
                                      {[u.nombre, u.telefono].filter(Boolean).join(' · ')}
                                    </span>
                                  ) : null}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="form-actions" style={{display:'flex',gap:'12px',padding:'18px 0',borderTop:'1px solid #eee',background:'rgba(255,255,255,0.95)',justifyContent:'flex-end',position:'sticky',bottom:0,zIndex:1}}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={creando}
                        style={{
                          background: 'linear-gradient(90deg,#d13fa0,#e7b2e6)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 22px',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          boxShadow: '0 2px 8px rgba(209,63,160,0.08)',
                          transition: '0.2s',
                          opacity: creando ? 0.7 : 1,
                          cursor: creando ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {creando ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{marginRight:8}}></span>
                            Creando...
                          </>
                        ) : (
                          'Crear Turno'
                        )}
                      </button>
                      <button type="button" className="btn btn-secondary" style={{background:'#fff',color:'#d13fa0',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'10px 22px',fontWeight:'bold',fontSize:'1rem',transition:'0.2s'}} onClick={() => setMostrarFormulario(false)}>Cancelar</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      {/* Modal de edición de turno */}
      {editando && turnoEditar && (
        <div className="modal-turno-bg" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,animation:'fadeInBg .4s'}} onClick={cerrarModalEditar}>
          <div className="modal-turno" style={{background:'linear-gradient(135deg,#fff 80%,#e7b2e6 100%)',borderRadius:'22px',boxShadow:'0 8px 40px rgba(180,0,90,0.18)',padding:'0',minWidth:'340px',maxWidth:'95vw',width:'520px',animation:'modalScaleIn .4s',position:'relative',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e => e.stopPropagation()}>
            <button style={{position:'absolute',top:18,right:18,background:'none',border:'none',fontSize:'1.3rem',color:'#d13fa0',cursor:'pointer',zIndex:2}} onClick={cerrarModalEditar} title="Cerrar">×</button>
            {/* Flujo igual al cliente: servicio, fecha, horario */}
            <div style={{padding:'38px 38px 0 38px',overflowY:'auto',flex:'1 1 auto'}}>
              <h3 style={{marginBottom:'22px',fontWeight:'bold',fontSize:'1.35rem',color:'#d13fa0'}}>Editar Turno</h3>
              {/* Paso 1: Servicio */}
              {!turnoEditar.servicioId && (
                <div>
                  <h4>Seleccioná el servicio</h4>
                  <div className="servicios-grid-reserva">
                    {Object.values(servicios).map((servicio) => (
                      <div key={servicio.id} className="servicio-card-reserva" onClick={() => setTurnoEditar({ ...turnoEditar, servicioId: servicio.id })}>
                        <h3>{servicio.nombre}</h3>
                        <p>{servicio.descripcion}</p>
                        <div className="servicio-info-reserva">
                          <span className="precio">${servicio.precio.toLocaleString()}</span>
                          <span className="duracion">{servicio.duracion} min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Paso 2: Fecha */}
              {turnoEditar.servicioId && !turnoEditar.fecha && (
                <div>
                  <h4>Seleccioná la fecha</h4>
                  <div className="fechas-grid">
                    {Array.from({length:14}).map((_,i) => {
                      const hoy = new Date();
                      const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()+i);
                      if (fecha.getDay() === 0) return null;
                      const fechaStr = fecha.toISOString().slice(0,10);
                      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                      const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                      return (
                        <div key={fechaStr} className={`fecha-card ${turnoEditar.fecha === fechaStr ? 'selected' : ''}`} onClick={() => setTurnoEditar({ ...turnoEditar, fecha: fechaStr })}>
                          <div className="fecha-dia">{dias[fecha.getDay()]}</div>
                          <div className="fecha-numero">{fecha.getDate()}</div>
                          <div className="fecha-mes">{meses[fecha.getMonth()]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Paso 3: Horario */}
              {turnoEditar.servicioId && turnoEditar.fecha && !turnoEditar.hora && (
                <HorarioSelectorAdmin fecha={turnoEditar.fecha} onSelect={hora => setTurnoEditar({ ...turnoEditar, hora })} />
              )}
              {/* Paso 4: Datos cliente y resumen */}
              {turnoEditar.servicioId && turnoEditar.fecha && turnoEditar.hora && (
                <form onSubmit={guardarEdicionTurno} style={{marginTop:'18px'}}>
                  <div className="form-grid" style={{gap:'18px'}}>
                    <div className="form-group">
                      <label className="form-label" style={{color:'#222',fontWeight:'bold'}}>Nombre del Cliente</label>
                      <input type="text" className="form-input" style={{background:'#fff',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'10px',fontSize:'1rem',color:'#222'}} value={turnoEditar.nombre} onChange={e => setTurnoEditar({ ...turnoEditar, nombre: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{color:'#222',fontWeight:'bold'}}>Teléfono</label>
                      <input type="tel" className="form-input" style={{background:'#fff',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'10px',fontSize:'1rem',color:'#222'}} value={turnoEditar.telefono} onChange={e => setTurnoEditar({ ...turnoEditar, telefono: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{color:'#222',fontWeight:'bold'}}>Email</label>
                      <input type="email" className="form-input" style={{background:'#fff',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'10px',fontSize:'1rem',color:'#222'}} value={turnoEditar.email} onChange={e => setTurnoEditar({ ...turnoEditar, email: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-actions" style={{display:'flex',gap:'12px',padding:'18px 0',borderTop:'1px solid #eee',background:'rgba(255,255,255,0.95)',justifyContent:'flex-end',position:'sticky',bottom:0,zIndex:1}}>
                    <button type="button" className="btn btn-secondary" style={{background:'#fff',color:'#d13fa0',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'10px 22px',fontWeight:'bold',fontSize:'1rem',transition:'0.2s'}} onClick={cerrarModalEditar}>Cerrar</button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={guardandoEdicion}
                      style={{
                        background:'linear-gradient(90deg,#d13fa0,#e7b2e6)',
                        color:'#fff',
                        border:'none',
                        borderRadius:'8px',
                        padding:'10px 22px',
                        fontWeight:'bold',
                        fontSize:'1rem',
                        boxShadow:'0 2px 8px rgba(209,63,160,0.08)',
                        transition:'0.2s',
                        opacity: guardandoEdicion ? 0.7 : 1,
                        cursor: guardandoEdicion ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {guardandoEdicion ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{marginRight:8}}></span>
                          Guardando...
                        </>
                      ) : (
                        'Guardar Cambios'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de reprogramación */}
      {reprogramando && turnoReprogramar && (
        <div className="modal-turno-bg" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1100,animation:'fadeInBg .4s'}} onClick={cerrarReprogramar}>
          <div className="modal-turno" style={{background:'linear-gradient(135deg,#fff 80%,#e7b2e6 100%)',borderRadius:'22px',boxShadow:'0 8px 40px rgba(180,0,90,0.18)',padding:'0',minWidth:'340px',maxWidth:'95vw',width:'860px',animation:'modalScaleIn .4s',position:'relative',display:'flex',flexDirection:'column',maxHeight:'90vh'}} onClick={e => e.stopPropagation()}>
            <button style={{position:'absolute',top:18,right:18,background:'none',border:'none',fontSize:'1.3rem',color:'#d13fa0',cursor:'pointer',zIndex:2}} onClick={cerrarReprogramar} title="Cerrar">×</button>
            <div style={{padding:'34px 34px 0 34px',overflowY:'auto',flex:'1 1 auto'}}>
              <h3 style={{marginBottom:'18px',fontWeight:'bold',fontSize:'1.35rem',color:'#d13fa0',display:'flex',alignItems:'center',gap:'10px'}}>
                <Wrench size={20} /> Reprogramar turno
              </h3>

              {(() => {
                const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
                const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                const fechaActualObj = new Date(String(turnoReprogramar.fecha) + 'T00:00:00');
                const fechaActualLabel = `${dias[fechaActualObj.getDay()]} ${fechaActualObj.getDate()} de ${meses[fechaActualObj.getMonth()]} ${fechaActualObj.getFullYear()}`;
                const fechaActualStr = String(turnoReprogramar.fecha || '').slice(0, 10);
                const horaActualStr = String(turnoReprogramar.hora || '').trim();
                const servicio = servicios[turnoReprogramar.servicioId];
                return (
                  <>
                    <div style={{display:'flex',gap:'16px',flexWrap:'wrap',alignItems:'flex-start'}}>
                      <div style={{flex:'1 1 280px',background:'#fff',border:'1.5px solid rgba(209,63,160,0.18)',borderRadius:'16px',padding:'14px 14px'}}>
                        <div style={{fontWeight:'900',color:'#d13fa0',marginBottom:'8px'}}>Fecha actual</div>
                        <div style={{color:'#222',fontWeight:'800',fontSize:'15px',lineHeight:1.25}}>{fechaActualLabel}</div>
                        <div style={{marginTop:'6px',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
                          <span style={{background:'rgba(209,63,160,0.10)',border:'1px solid rgba(209,63,160,0.18)',color:'#d13fa0',borderRadius:'999px',padding:'6px 10px',fontWeight:'900',fontSize:'13px'}}>
                            {turnoReprogramar.hora} hs
                          </span>
                          <span style={{color:'rgba(0,0,0,0.65)',fontWeight:'700',fontSize:'13px'}}>
                            {servicio?.nombre || 'Servicio'}
                          </span>
                        </div>
                        <div style={{marginTop:'10px',fontSize:'13px',color:'rgba(0,0,0,0.68)'}}>
                          <div><b>Cliente:</b> {turnoReprogramar.nombre || 'Sin nombre'}</div>
                          <div><b>Email:</b> {turnoReprogramar.email || '-'}</div>
                        </div>
                        <div style={{marginTop:'12px',fontSize:'12px',color:'rgba(0,0,0,0.60)'}}>
                          Al reprogramar, este horario vuelve a quedar libre.
                        </div>
                      </div>

                      <div style={{flex:'2 1 420px',background:'#fff',border:'1.5px solid rgba(209,63,160,0.18)',borderRadius:'16px',padding:'14px 14px'}}>
                        <div style={{fontWeight:'900',color:'#d13fa0',marginBottom:'8px'}}>Nueva fecha y horario</div>
                        <div className="reprog-fechas-grid" style={{marginBottom:'10px'}}>
                          {Array.from({length:14}).map((_,i) => {
                            const hoy = new Date();
                            const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()+i);
                            if (fecha.getDay() === 0) return null;
                            const fechaStr = fecha.toISOString().slice(0,10);
                            const diasAbrev = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                            const mesesAbrev = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                            return (
                              <div
                                key={fechaStr}
                                className={`fecha-card ${reprog.fecha === fechaStr ? 'selected' : ''}`}
                                onClick={() => setReprog({ fecha: fechaStr, hora: '' })}
                              >
                                <div className="fecha-dia">{diasAbrev[fecha.getDay()]}</div>
                                <div className="fecha-numero">{fecha.getDate()}</div>
                                <div className="fecha-mes">{mesesAbrev[fecha.getMonth()]}</div>
                              </div>
                            );
                          })}
                        </div>

                        {reprog.fecha ? (
                          <div className="reprog-horarios">
                            <HorarioSelectorAdmin
                              fecha={reprog.fecha}
                              ignoreTurnoId={turnoReprogramar.id}
                              blockedHoras={reprog.fecha === fechaActualStr && horaActualStr ? [horaActualStr] : []}
                              selectedHora={reprog.hora}
                              onSelect={(hora) => setReprog((prev) => ({ ...prev, hora }))}
                            />
                          </div>
                        ) : (
                          <div className="no-horarios" style={{marginTop:'8px'}}>
                            <p>Elegí una fecha para ver los horarios disponibles.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{marginTop:'14px',padding:'12px 14px',borderRadius:'16px',border:'1px solid rgba(0,0,0,0.08)',background:'rgba(255,255,255,0.96)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}>
                      <div style={{fontWeight:'900',color:'#222'}}>
                        Nueva reserva:{' '}
                        <span style={{color:'#d13fa0'}}>
                          {reprog.fecha ? format(new Date(reprog.fecha + 'T00:00:00'), 'dd/MM/yyyy') : '—'}
                        </span>
                        {' '}·{' '}
                        <span style={{color:'#d13fa0'}}>{reprog.hora || '—'}</span>
                      </div>
                      <div style={{fontSize:'12px',color:'rgba(0,0,0,0.55)'}}>
                        Si el email está configurado, se enviará una notificación al cliente.
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="form-actions" style={{display:'flex',gap:'12px',padding:'18px 34px',borderTop:'1px solid #eee',background:'rgba(255,255,255,0.95)',justifyContent:'flex-end',position:'sticky',bottom:0,zIndex:1}}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!reprog.fecha || !reprog.hora || guardandoReprog}
                onClick={confirmarReprogramacion}
                style={{
                  background: 'linear-gradient(90deg,#d13fa0,#e7b2e6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 22px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 2px 8px rgba(209,63,160,0.08)',
                  transition: '0.2s',
                  opacity: (!reprog.fecha || !reprog.hora || guardandoReprog) ? 0.7 : 1,
                  cursor: (!reprog.fecha || !reprog.hora || guardandoReprog) ? 'not-allowed' : 'pointer'
                }}
              >
                {guardandoReprog ? 'Reprogramando...' : 'Confirmar reprogramación'}
              </button>
              <button type="button" className="btn btn-secondary" style={{background:'#fff',color:'#d13fa0',border:'1.5px solid #d13fa0',borderRadius:'8px',padding:'10px 22px',fontWeight:'bold',fontSize:'1rem',transition:'0.2s'}} onClick={cerrarReprogramar}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

        <div className="turnos-tabla">
          {turnosTotal > 0 ? (
            <div className="turnos-admin-list" style={{marginTop:'18px'}}>
              <div className="turnos-list-header">
                <div className="turnos-summary">
                  Mostrando {mostrandoDesde}-{mostrandoHasta} de {turnosTotal}
                </div>
                {turnosTotalPages > 1 && (
                  <div className="turnos-pager" aria-label="Paginación">
                    <button
                      type="button"
                      className="turnos-page-btn"
                      onClick={() => setTurnosPage((p) => Math.max(1, p - 1))}
                      disabled={turnosPage === 1}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="turnos-page-indicator">
                      {turnosPage}/{turnosTotalPages}
                    </span>
                    <button
                      type="button"
                      className="turnos-page-btn"
                      onClick={() => setTurnosPage((p) => Math.min(turnosTotalPages, p + 1))}
                      disabled={turnosPage === turnosTotalPages}
                      aria-label="Página siguiente"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="turnos-table" role="table" aria-label="Listado de turnos">
                <div className="turnos-row turnos-row-header" role="row">
                  <div className="turnos-cell cell-servicio" role="columnheader">
                    <span className="turnos-num turnos-num-header">N°</span>
                    <span>Servicio</span>
                  </div>
                  <div className="turnos-cell cell-cliente" role="columnheader">Cliente</div>
                  <div className="turnos-cell cell-fechaHora" role="columnheader">Fecha y hora</div>
                  <div className="turnos-cell cell-estado" role="columnheader">Estado</div>
                  <div className="turnos-cell cell-pagos" role="columnheader">Pagos</div>
                  <div className="turnos-cell cell-reprog" role="columnheader">Reprogramar</div>
                  <div className="turnos-cell cell-opciones" role="columnheader">Editar</div>
                </div>

                {turnosPaginados.map((turno, idx) => {
                  const servicio = servicios[turno.servicioId];
                  const usuario = usuarios[turno.usuarioId];
                  const nombreUsuario = usuario?.nombre || turno.nombre || 'Sin nombre';
                  const rowNum = turnosStart + idx + 1;

                  const isPagosOpen = pagosOpenId === turno.id;

                  let estadoLabel = turno.estado;
                  let estadoColor = '#1e7e34';
                  if (turno.estado === 'cancelado') {
                    estadoLabel = 'Cancelado';
                    estadoColor = '#e53935';
                  } else if (turno.estado === 'confirmado') {
                    estadoLabel = 'Confirmado';
                    estadoColor = '#1976d2';
                  } else if (turno.estado === 'completado') {
                    estadoLabel = 'Completado';
                    estadoColor = '#388e3c';
                  } else if (turno.estado === 'en_proceso') {
                    estadoColor = '#ff9800';
                  }

                  estadoLabel = String(estadoLabel || '').split('_').join(' ');

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

                      <div className="turnos-cell cell-pagos" role="cell">
                        <div className="turnos-pagos-top">
                          <span className="turnos-pago-item">
                            <span className="k">Total:</span>{' '}
                            <span className="v total">${turno.montoTotal.toLocaleString()}</span>
                          </span>
                          <button
                            type="button"
                            className="turnos-pagos-toggle"
                            onClick={() => setPagosOpenId((curr) => (curr === turno.id ? null : turno.id))}
                            aria-label={isPagosOpen ? 'Ocultar pagos' : 'Ver pagos'}
                            title={isPagosOpen ? 'Ocultar' : 'Ver detalle'}
                          >
                            {isPagosOpen ? '▴' : '▾'}
                          </button>
                        </div>

                        <div className={`turnos-pagos-details ${isPagosOpen ? 'is-open' : ''}`}>
                          <span className="turnos-pago-item">
                            <span className="k">Pagado:</span>{' '}
                            <span className="v pagado">${turno.montoPagado.toLocaleString()}</span>
                          </span>
                          <span className="turnos-pago-item">
                            <span className="k">Resta:</span>{' '}
                            <span className="v resta">${(turno.montoTotal - turno.montoPagado).toLocaleString()}</span>
                          </span>
                          <span className="turnos-pago-item turnos-pago-id">
                            <span className="k">ID pago:</span>{' '}
                            <span className="v id">{turno.pagoId || turno.id}</span>
                          </span>
                        </div>
                      </div>

                      <div className="turnos-cell cell-reprog" role="cell">
                        <button
                          className="turnos-editar-btn"
                          onClick={() => abrirReprogramar(turno)}
                          title="Reprogramar"
                          type="button"
                        >
                          <Wrench size={18} />
                        </button>
                      </div>

                      <div className="turnos-cell cell-opciones" role="cell">
                        <button
                          className="turnos-editar-btn turnos-menu-btn"
                          onClick={() => setMobileMenuOpenId(turno.id)}
                          title="Ver detalles"
                          type="button"
                          aria-label="Ver detalles y acciones"
                        >
                          <MoreVertical size={18} />
                        </button>
                        <button
                          className="turnos-editar-btn turnos-edit-btn"
                          onClick={() => handleEditarTurno(turno)}
                          title="Editar"
                          type="button"
                        >
                          <Pencil size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="no-data">No se encontraron turnos</p>
          )}
        </div>

        {/* Modal mobile: detalle + acciones (solo se muestra en celular por CSS) */}
        {mobileMenuOpenId && mobileMenuTurno && (() => {
          const turno = mobileMenuTurno;
          const servicio = servicios[turno.servicioId];
          const usuario = usuarios[turno.usuarioId];
          const nombreUsuario = usuario?.nombre || turno.nombre || 'Sin nombre';

          let estadoLabel = turno.estado;
          let estadoColor = '#1e7e34';
          if (turno.estado === 'cancelado') {
            estadoLabel = 'Cancelado';
            estadoColor = '#e53935';
          } else if (turno.estado === 'confirmado') {
            estadoLabel = 'Confirmado';
            estadoColor = '#1976d2';
          } else if (turno.estado === 'completado') {
            estadoLabel = 'Completado';
            estadoColor = '#388e3c';
          } else if (turno.estado === 'en_proceso') {
            estadoColor = '#ff9800';
          }
          estadoLabel = String(estadoLabel || '').split('_').join(' ');

          return (
            <div className="turnos-mobile-modal-bg" onClick={() => setMobileMenuOpenId(null)}>
              <div className="turnos-mobile-modal" role="dialog" aria-modal="true" aria-label="Detalle del turno" onClick={(e) => e.stopPropagation()}>
                <button className="turnos-mobile-modal-close" type="button" onClick={() => setMobileMenuOpenId(null)} title="Cerrar">
                  ×
                </button>

                <div className="turnos-mobile-modal-title">Detalle del turno</div>

                <div className="turnos-mobile-modal-head">
                  <div className="turnos-mobile-modal-servicio">{servicio?.nombre || 'Servicio'}</div>
                  <div className="turnos-mobile-modal-cliente">{nombreUsuario}</div>
                </div>

                <div className="turnos-mobile-menu-grid">
                  <div className="turnos-mobile-menu-item">
                    <div className="k">Fecha y hora</div>
                    <div className="v">{format(new Date(turno.fecha + 'T00:00:00'), 'dd/MM/yyyy')} · {turno.hora} hs</div>
                  </div>

                  <div className="turnos-mobile-menu-item">
                    <div className="k">Estado</div>
                    <div className="v">
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
                  </div>

                  <div className="turnos-mobile-menu-item">
                    <div className="k">Pagos</div>
                    <div className="v">
                      <div className="turnos-mobile-pagos">
                        <span className="turnos-pago-item">
                          <span className="k">Total:</span>{' '}
                          <span className="v total">${turno.montoTotal.toLocaleString()}</span>
                        </span>
                        <span className="turnos-pago-item">
                          <span className="k">Pagado:</span>{' '}
                          <span className="v pagado">${turno.montoPagado.toLocaleString()}</span>
                        </span>
                        <span className="turnos-pago-item">
                          <span className="k">Resta:</span>{' '}
                          <span className="v resta">${(turno.montoTotal - turno.montoPagado).toLocaleString()}</span>
                        </span>
                        <span className="turnos-pago-item turnos-pago-id">
                          <span className="k">ID pago:</span>{' '}
                          <span className="v id">{turno.pagoId || turno.id}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="turnos-mobile-menu-actions">
                  <button
                    type="button"
                    className="turnos-mobile-action"
                    onClick={() => {
                      setMobileMenuOpenId(null);
                      abrirReprogramar(turno);
                    }}
                  >
                    <Wrench size={18} /> Reprogramar
                  </button>
                  <button
                    type="button"
                    className="turnos-mobile-action"
                    onClick={() => {
                      setMobileMenuOpenId(null);
                      handleEditarTurno(turno);
                    }}
                  >
                    <Pencil size={18} /> Editar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default Turnos;
