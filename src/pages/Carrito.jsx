import { crearPreferencia } from '../services/mercadoPago';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrito } from '../store/useCarritoStore';
import { useAuth } from '../context/AuthContext';
import { horariosAPI, turnosAPI } from '../services/api';
import { ShoppingCart, Trash2, CreditCard, Plus, Wallet } from 'lucide-react';
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
  // NOTA: NO crear turnos aquí. Esperar confirmación de Mercado Pago primero.
  const pagarConMercadoPago = async () => {
    if (!user) { toast.error('Debes iniciar sesión para continuar'); navigate('/login'); return; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setProcesando(true);
    try {
      const pagoIdGlobal = 'MP' + Date.now() + Math.random().toString(36).substr(2, 9);
      
      // Guardar el carrito y datos del usuario para crear turnos después del pago aprobado
      const carritoParaPago = items.map((item) => ({
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono || '',
        servicio: item.servicio.id,
        fecha: item.fecha,
        hora: item.hora,
        estado: 'confirmado', // Estado final después de pago aprobado
        pagoId: pagoIdGlobal,
        montoPagado: item.servicio.precio / 2,
        montoTotal: item.servicio.precio,
        createdAt: new Date().toISOString(),
      }));

      localStorage.setItem('mpPagoIdPendiente', pagoIdGlobal);
      localStorage.setItem('mpCarritoPendiente', JSON.stringify(carritoParaPago));

      const carritoMP = items.map(item => ({
        titulo: item.servicio.nombre,
        precio: item.servicio.precio / 2, // Seña 50%
        cantidad: 1
      }));

      const metadata = { pagoId: pagoIdGlobal };
      const data = await crearPreferencia(carritoMP, metadata);
      if (data.init_point) {
        sessionStorage.setItem('mpPagoPendiente', '1');
        window.location.href = data.init_point;
      } else {
        localStorage.removeItem('mpPagoIdPendiente');
        localStorage.removeItem('mpCarritoPendiente');
        toast.error('No se pudo iniciar el pago');
      }
    } catch (e) {
      localStorage.removeItem('mpPagoIdPendiente');
      localStorage.removeItem('mpCarritoPendiente');
      toast.error('Error al conectar con Mercado Pago');
    } finally {
      setProcesando(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status') || params.get('collection_status');
    const paymentId = params.get('payment_id') || params.get('collection_id') || params.get('paymentId');
    const esRetornoMP = Boolean(status || paymentId);

    if (!esRetornoMP) {
      return;
    }

    // Si el pago NO fue aprobado, limpiar todo y volver al carrito
    if (status && status !== 'approved') {
      sessionStorage.removeItem('mpPagoPendiente');
      localStorage.removeItem('mpPagoIdPendiente');
      localStorage.removeItem('mpCarritoPendiente');
      setMpReturnProcessing(false);
      // Mostrar alerta pero permitir que el carrito se mantenga intacto
      toast.info('Pago cancelado. Tu carrito se mantiene guardado.', { autoClose: 5000 });
      // Limpiar parámetros de URL sin recargar
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (mpProcesadoRef.current) {
      return;
    }

    mpProcesadoRef.current = true;
    setMpReturnProcessing(true);

    (async () => {
      try {
        const carritoParaPagoRaw = localStorage.getItem('mpCarritoPendiente');
        const carritoParaPago = carritoParaPagoRaw ? JSON.parse(carritoParaPagoRaw) : [];

        if (!Array.isArray(carritoParaPago) || carritoParaPago.length === 0) {
          throw new Error('No hay turnos para crear');
        }

        toast.info('Pago aprobado. Estamos creando tus turnos...', { autoClose: 5000 });

        // Crear todos los turnos con estado "confirmado" AHORA que el pago fue aprobado
        const resultados = await Promise.allSettled(
          carritoParaPago.map((turnoData) =>
            withTimeout(turnosAPI.create(turnoData), 45000, 'Creación de turno')
          )
        );

        const creados = [];
        const fallidos = [];

        resultados.forEach((resultado, index) => {
          if (resultado.status === 'fulfilled') {
            creados.push(resultado.value?.data || {});
          } else {
            const err = resultado.reason;
            const mensaje = err?.response?.data?.mensaje || err?.message || 'Error desconocido';
            fallidos.push({ index, mensaje });
          }
        });

        if (fallidos.length > 0 && creados.length === 0) {
          throw new Error(fallidos[0]?.mensaje || 'No se pudieron crear los turnos');
        }

        sessionStorage.removeItem('mpPagoPendiente');
        localStorage.removeItem('mpPagoIdPendiente');
        localStorage.removeItem('mpCarritoPendiente');
        vaciarCarrito();
        toast.success('Pago confirmado. Turno guardado y correo enviado.');
        navigate('/mis-turnos');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        mpProcesadoRef.current = false;
        const mensaje = error?.response?.data?.mensaje || error?.response?.data?.error || error?.message || 'No pudimos confirmar el pago';
        toast.error(mensaje);
      } finally {
        setMpReturnProcessing(false);
      }
    })();
  }, [navigate, vaciarCarrito]);

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
            <div className="carrito-items-box">
              <div className="carrito-items-header">
                <h3>Servicios en tu carrito</h3>
                <span className="carrito-items-count">
                  {items.length} {items.length === 1 ? 'servicio' : 'servicios'}
                </span>
              </div>

              <div className="carrito-items-list">
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

              <div className="carrito-items-actions">
                <button
                  className="btn btn-secondary carrito-add-btn"
                  type="button"
                  onClick={() => navigate('/reservar')}
                >
                  <Plus size={18} />
                  Agregar más servicios
                </button>
              </div>
            </div>
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
              <div className="carrito-pay-title">Elegí tu medio de pago</div>
              <div className="carrito-pay-actions">
                <button className="btn btn-secondary btn-pagar" onClick={pagarConMercadoPago} disabled={procesando}>
                  {procesando ? (
                    <>
                      <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Wallet size={20} />
                      Mercado Pago
                    </>
                  )}
                </button>

                <PagarConTransferenciaBtn />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carrito;
