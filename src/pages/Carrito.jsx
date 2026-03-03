import { crearPreferencia } from '../services/mercadoPago';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrito } from '../store/useCarritoStore';
import { useAuth } from '../context/AuthContext';
import { horariosAPI, turnosAPI } from '../services/api';
import { ShoppingCart, Trash2, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import './Carrito.css';
import PagarConTransferenciaBtn from '../components/Carrito/PagarConTransferenciaBtn';

const Carrito = () => {
  const navigate = useNavigate();
  const { items, eliminarDelCarrito, vaciarCarrito, calcularTotal, calcularSeña } = useCarrito();
  const resumenRef = useRef(null);
    useEffect(() => {
      if (window.history.state && window.history.state.usr && window.history.state.usr.scrollToResumen) {
        setTimeout(() => {
          if (resumenRef.current) {
            const y = resumenRef.current.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 200);
      }
    }, []);
  const { user } = useAuth();
  const [procesando, setProcesando] = useState(false);
  const [mpReturnProcessing, setMpReturnProcessing] = useState(false);
  const [mpCheckToken, setMpCheckToken] = useState(0);
  const mpProcesadoRef = useRef(false);
  const mpReturnTimeoutRef = useRef(null);

  useEffect(() => {
    if (items.length === 0) return;

    let cancelado = false;

    const limpiarItemsInvalidos = async () => {
      const ahora = new Date();
      const porFecha = new Map();

      items.forEach((item) => {
        if (!porFecha.has(item.fecha)) {
          porFecha.set(item.fecha, []);
        }
        porFecha.get(item.fecha).push(item);
      });

      const expirados = [];
      const ocupados = [];

      for (const [fecha, itemsFecha] of porFecha.entries()) {
        const fechaBase = new Date(`${fecha}T00:00:00`);
        const fechaPaso = fechaBase < new Date(ahora.toDateString() + 'T00:00:00');

        if (fechaPaso) {
          expirados.push(...itemsFecha);
          continue;
        }

        let estado = null;
        try {
          estado = await horariosAPI.getEstadoDia(fecha);
        } catch {
          estado = null;
        }

        itemsFecha.forEach((item) => {
          const hora = item.hora || '00:00';
          const fechaHora = new Date(`${item.fecha}T${hora}:00`);
          if (fechaHora <= ahora) {
            expirados.push(item);
            return;
          }
          if (!estado) return;
          if (!estado.disponibles.includes(hora)) {
            ocupados.push(item);
          }
        });
      }

      if (cancelado) return;

      const removidosIds = new Set([
        ...expirados.map((item) => item.id),
        ...ocupados.map((item) => item.id),
      ]);

      if (removidosIds.size === 0) return;

      removidosIds.forEach((id) => eliminarDelCarrito(id));

      if (window.innerWidth <= 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (expirados.length > 0) {
        const cantidad = expirados.length;
        toast.info(`Se removio ${cantidad} turno${cantidad > 1 ? 's' : ''} porque la fecha/hora ya paso.`);
      }
      if (ocupados.length > 0) {
        const cantidad = ocupados.length;
        toast.error(`Se removio ${cantidad} turno${cantidad > 1 ? 's' : ''} porque el horario ya estaba ocupado.`);
      }
    };

    limpiarItemsInvalidos();

    return () => {
      cancelado = true;
    };
  }, [items, eliminarDelCarrito]);

  const withTimeout = (promise, ms, label = 'Operación') =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} tardó demasiado (${ms}ms)`)), ms)
      ),
    ]);

  // Botón para pagar con Mercado Pago
  const pagarConMercadoPago = async () => {
    if (!user) { toast.error('Debes iniciar sesión para continuar'); navigate('/login'); return; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setProcesando(true);
    try {
      const pagoIdGlobal = 'MP' + Date.now() + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('mpPagoIdPendiente', pagoIdGlobal);

      const turnosData = items.map((item) => ({
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono || '',
        servicio: item.servicio.id,
        fecha: item.fecha,
        hora: item.hora,
        estado: 'pendiente',
        pagoId: pagoIdGlobal,
        montoPagado: item.servicio.precio / 2,
        montoTotal: item.servicio.precio,
        enviarEmail: false,
        createdAt: new Date().toISOString(),
      }));

      const resultadosTurnos = await Promise.allSettled(
        turnosData.map((turno) =>
          withTimeout(turnosAPI.create(turno), 45000, 'Creación de turno')
        )
      );

      const turnosIds = [];
      const fallidos = [];

      resultadosTurnos.forEach((resultado, index) => {
        if (resultado.status === 'fulfilled') {
          const creado = resultado.value?.data || {};
          const id = creado.id || creado._id;
          if (id) {
            turnosIds.push(id);
            return;
          }
          fallidos.push({ item: items[index], mensaje: 'Respuesta inválida del servidor' });
          return;
        }

        const err = resultado.reason;
        const mensaje = err?.response?.data?.mensaje || err?.message || 'Error desconocido';
        fallidos.push({ item: items[index], mensaje });
      });

      if (fallidos.length > 0) {
        toast.error(fallidos[0].mensaje || 'No se pudo preparar el pago');
        return;
      }

      localStorage.setItem('mpTurnosPendientes', JSON.stringify(turnosIds));

      const carritoMP = items.map(item => ({
        titulo: item.servicio.nombre,
        precio: item.servicio.precio / 2, // Seña 50%
        cantidad: 1
      }));

      const metadata = { turnosIds, pagoId: pagoIdGlobal };
      const data = await crearPreferencia(carritoMP, metadata);
      if (data.init_point) {
        sessionStorage.setItem('mpPagoPendiente', '1');
        window.location.href = data.init_point;
      } else {
        toast.error('No se pudo iniciar el pago');
      }
    } catch (e) {
      toast.error('Error al conectar con Mercado Pago');
    } finally {
      setProcesando(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status') || params.get('collection_status');
    const approved = status === 'approved' || params.get('payment_id');
    const mpPendiente = sessionStorage.getItem('mpPagoPendiente');
    const esRetornoMP = Boolean(status || mpPendiente || params.get('payment_id'));

    if (!esRetornoMP) {
      return;
    }

    if (approved) {
      if (!mpProcesadoRef.current) {
        mpProcesadoRef.current = true;
        setMpReturnProcessing(true);
        sessionStorage.removeItem('mpPagoPendiente');
        localStorage.removeItem('mpPagoIdPendiente');
        localStorage.removeItem('mpTurnosPendientes');
        toast.info('Pago aprobado. Estamos confirmando tu turno...', { autoClose: 5000 });
        vaciarCarrito();
        setTimeout(() => {
          navigate('/mis-turnos');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setMpReturnProcessing(false);
        }, 800);
      }
      return;
    }

    if (status && status !== 'approved') {
      sessionStorage.removeItem('mpPagoPendiente');
      localStorage.removeItem('mpPagoIdPendiente');
      localStorage.removeItem('mpTurnosPendientes');
      setMpReturnProcessing(false);
      toast.error('El pago no se completó en Mercado Pago');
    }
  }, [items.length, procesando]);

  useEffect(() => {
    if (!mpReturnProcessing) {
      if (mpReturnTimeoutRef.current) {
        clearTimeout(mpReturnTimeoutRef.current);
        mpReturnTimeoutRef.current = null;
      }
      return;
    }

    if (mpReturnTimeoutRef.current) {
      clearTimeout(mpReturnTimeoutRef.current);
    }

    mpReturnTimeoutRef.current = setTimeout(() => {
      setMpReturnProcessing(false);
    }, 15000);

    return () => {
      if (mpReturnTimeoutRef.current) {
        clearTimeout(mpReturnTimeoutRef.current);
        mpReturnTimeoutRef.current = null;
      }
    };
  }, [mpReturnProcessing]);

  useEffect(() => {
    const triggerCheck = () => {
      const pagoIdPendiente = localStorage.getItem('mpPagoIdPendiente');
      const turnosPendientesRaw = localStorage.getItem('mpTurnosPendientes');
      if (pagoIdPendiente && turnosPendientesRaw) {
        setMpCheckToken((token) => token + 1);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerCheck();
      }
    };

    triggerCheck();
    window.addEventListener('focus', triggerCheck);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', triggerCheck);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!user || (!user._id && !user.id)) return;
    const pagoIdPendiente = localStorage.getItem('mpPagoIdPendiente');
    const turnosPendientesRaw = localStorage.getItem('mpTurnosPendientes');
    const turnosPendientes = turnosPendientesRaw ? JSON.parse(turnosPendientesRaw) : [];

    if (!pagoIdPendiente || turnosPendientes.length === 0) {
      setMpReturnProcessing(false);
      return;
    }

    setMpReturnProcessing(true);

    let intentos = 0;
    const maxIntentos = 12;
    const intervalMs = 3000;

    const intervalId = setInterval(async () => {
      intentos += 1;
      try {
        const turnos = await turnosAPI.getByUsuario(user._id || user.id);
        const confirmadosIds = new Set(
          (Array.isArray(turnos) ? turnos : [])
            .filter((turno) => turno.estado === 'confirmado')
            .map((turno) => String(turno.id || turno._id))
        );
        const confirmado = turnosPendientes.every((id) => confirmadosIds.has(String(id)));
        if (confirmado) {
          clearInterval(intervalId);
          localStorage.removeItem('mpPagoIdPendiente');
          localStorage.removeItem('mpTurnosPendientes');
          vaciarCarrito();
          toast.success('Pago confirmado. Turno guardado.');
          navigate('/mis-turnos');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setMpReturnProcessing(false);
          return;
        }
      } catch (error) {
        // Si falla, seguimos intentando hasta agotar el tiempo.
      }

      if (intentos >= maxIntentos) {
        clearInterval(intervalId);
        localStorage.removeItem('mpPagoIdPendiente');
        localStorage.removeItem('mpTurnosPendientes');
        setMpReturnProcessing(false);
        toast.info('No pudimos confirmar el pago. Revisá Mis Turnos en unos minutos.', { autoClose: 6000 });
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [user, navigate, vaciarCarrito, mpCheckToken]);

  const procesarPago = async () => {
    if (!user) { toast.error('Debes iniciar sesión para continuar'); navigate('/login'); return; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setProcesando(true);
    try {
      const pagoIdGlobal = 'MP' + Date.now() + Math.random().toString(36).substr(2, 9);

      const confirmadosIds = [];
      const fallidos = [];

      const resultados = await Promise.allSettled(
        items.map(async (item) => {
          const turnoData = {
            email: user.email,
            nombre: user.nombre,
            telefono: user.telefono || '',
            servicio: item.servicio.id,
            fecha: item.fecha,
            hora: item.hora,
            estado: 'confirmado',
            pagoId: pagoIdGlobal,
            montoPagado: item.servicio.precio / 2,
            montoTotal: item.servicio.precio,
            createdAt: new Date().toISOString(),
          };

          await withTimeout(turnosAPI.create(turnoData), 45000, 'Creación de turno');
          return { id: item.id };
        })
      );

      resultados.forEach((resultado, index) => {
        if (resultado.status === 'fulfilled') {
          confirmadosIds.push(resultado.value.id);
          return;
        }

        const item = items[index];
        const err = resultado.reason;
        const status = err?.response?.status;
        const mensaje = err?.response?.data?.mensaje || err?.message || 'Error desconocido';
        fallidos.push({ item, status, mensaje });
      });

      // Sacar del carrito los turnos que ya quedaron confirmados
      confirmadosIds.forEach((id) => eliminarDelCarrito(id));

      if (fallidos.length > 0) {
        // Mostrar el primer motivo claro (409: horario no disponible / duplicado)
        const first = fallidos[0];
        toast.error(first.mensaje || 'Uno o más turnos no pudieron confirmarse');
        if (confirmadosIds.length > 0) {
          toast.info('Se confirmaron algunos turnos. Revisá tu carrito para los que faltan.', { autoClose: 7000 });
          navigate('/mis-turnos');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      toast.success('¡Turno confirmado en Delfina Nails Studio!');
      toast.info('Si no ves el email, revisá Spam/Promociones.', { autoClose: 6000 });
      toast.info('Dirección: Barrio San Martín mza A casa 5. Recordá llegar 5 minutos antes.', { autoClose: 7000 });
      vaciarCarrito();
      navigate('/mis-turnos');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      toast.error('Error al procesar el pago. Intenta nuevamente.');
    } finally {
      setProcesando(false);
      setMpReturnProcessing(false);
    }
  };

  if (mpReturnProcessing) {
    return (
      <div className="carrito-vacio">
        <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }}></div>
        <h2>Confirmando pago...</h2>
        <p>En unos segundos te llevamos a Mis Turnos.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="carrito-vacio">
        <ShoppingCart size={80} />
        <h2>Tu carrito está vacío</h2>
        <p>Agregá servicios para reservar tus turnos</p>
        <button className="btn btn-primary" onClick={() => navigate('/reservar')}>Explorar Servicios</button>
      </div>
    );
  }

  return (
    <div className="carrito-page">
      <div className="carrito-header">
        <h1>
          <span className="header-icon"><ShoppingCart size={28} /></span>
          Mi Carrito
        </h1>
      </div>
      <div className="container">
        <div className="carrito-content">
          <div className="carrito-items">
            {items.map((item) => (
              <div key={item.id} className="carrito-item">
                <div className="item-info">
                  <h3>{item.servicio?.nombre || ''}</h3>
                  <p className="item-fecha">📅 {format(new Date(item.fecha + 'T00:00:00'), 'dd/MM/yyyy')} - 🕐 {item.hora} hs</p>
                  <p className="item-duracion">⏱️ Duración: {item.servicio?.duracion || 0} minutos</p>
                </div>
                <div className="item-precio">
                  <div className="precio-total"><span className="label">Precio total:</span><span className="valor">${(item.servicio?.precio || 0).toLocaleString()}</span></div>
                  <div className="precio-seña"><span className="label">Seña (50%):</span><span className="valor">${((item.servicio?.precio || 0) / 2).toLocaleString()}</span></div>
                </div>
                <button className="btn-eliminar" onClick={() => eliminarDelCarrito(item.id)} title="Eliminar"><Trash2 size={20} /></button>
              </div>
            ))}
          </div>

          <div className="carrito-resumen" ref={resumenRef}>
            <div className="resumen-card">
              <h3>Resumen de Compra</h3>
              <div className="resumen-detalle"><span>Cantidad de servicios:</span><strong>{items.length}</strong></div>
              <div className="resumen-detalle"><span>Total servicios:</span><strong>${calcularTotal().toLocaleString()}</strong></div>
              <div className="resumen-seña-total"><span>Total a pagar (50% seña):</span><strong className="precio-final">${calcularSeña().toLocaleString()}</strong></div>
              <div className="resumen-info">
                <p>💳 Seña segura con Mercado Pago</p>
                <p>📧 Email de confirmación</p>
                <p>🏠 Dirección: Barrio San Martín mza A casa 5</p>
                <p>💰 Resto en el estudio</p>
              </div>
              {/* <button className="btn btn-primary btn-pagar" onClick={procesarPago} disabled={procesando}>
                {procesando ? (<><div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>Procesando...</>) : (<><CreditCard size={20} />Pagar (prueba local)</>)}
              </button> */}
              {/* <button className="btn btn-secondary btn-pagar" style={{marginTop:8}} onClick={pagarConMercadoPago} disabled={procesando}>
                {procesando ? (<><div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>Procesando...</>) : (<><CreditCard size={20} />Pagar con Mercado Pago</>)}
              </button> */}
              <PagarConTransferenciaBtn />
              <button className="btn btn-secondary mt-2" onClick={() => navigate('/reservar')}>Agregar más servicios</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carrito;
