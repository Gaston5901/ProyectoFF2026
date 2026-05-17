import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usuariosAPI, turnosAPI } from '../services/api';
import { useCarritoStore, setCarritoStorageForUser } from '../store/useCarritoStore';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mpReconciling, setMpReconciling] = useState(false);
  const vaciarCarrito = useCarritoStore((state) => state.vaciarCarrito);
  const navigate = useNavigate();
  const mpIntervalRef = useRef(null);

  useEffect(() => {
    (async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        await setCarritoStorageForUser(parsed);
      } else {
        await setCarritoStorageForUser(null);
      }
      setLoading(false);
    })();
  }, []);

  // Si el usuario cambia (login/register/logout), rehidratar el carrito correcto
  useEffect(() => {
    setCarritoStorageForUser(user);
  }, [user]);

  useEffect(() => {
    if (!user || (!user._id && !user.id)) return;
    const pagoIdPendiente = localStorage.getItem('mpPagoIdPendiente');
    const turnosPendientesRaw = localStorage.getItem('mpTurnosPendientes');
    let turnosPendientes = [];

    try {
      turnosPendientes = turnosPendientesRaw ? JSON.parse(turnosPendientesRaw) : [];
    } catch {
      turnosPendientes = [];
    }

    if (!pagoIdPendiente && turnosPendientes.length === 0) return;

    let cancelado = false;
    let intentos = 0;
    const maxIntentos = 8;
    const intervalMs = 3000;

    const limpiarIntervalo = () => {
      if (mpIntervalRef.current) {
        clearInterval(mpIntervalRef.current);
        mpIntervalRef.current = null;
      }
    };

    const check = async () => {
      if (cancelado) return;
      intentos += 1;
      try {
        const turnos = await turnosAPI.getByUsuario(user._id || user.id);
        const confirmadosIds = new Set(
          (Array.isArray(turnos) ? turnos : [])
            .filter((turno) => turno.estado === 'confirmado')
            .map((turno) => String(turno.id || turno._id))
        );
        const confirmado = turnosPendientes.length > 0
          ? turnosPendientes.every((id) => confirmadosIds.has(String(id)))
          : Array.isArray(turnos) && turnos.some(
            (turno) => turno.pagoId === pagoIdPendiente && turno.estado === 'confirmado'
          );

        if (confirmado) {
          limpiarIntervalo();
          localStorage.removeItem('mpPagoIdPendiente');
          localStorage.removeItem('mpTurnosPendientes');
          vaciarCarrito();
          setMpReconciling(false);
          if (window.location.pathname !== '/mis-turnos') {
            navigate('/mis-turnos', { replace: true });
          }
          return;
        }
      } catch (error) {
        // Sin accion: si falla, se reintenta en el proximo intento.
      }

      if (intentos >= maxIntentos) {
        limpiarIntervalo();
        setMpReconciling(false);
      }
    };

    setMpReconciling(true);
    check();
    limpiarIntervalo();
    mpIntervalRef.current = setInterval(check, intervalMs);

    return () => {
      cancelado = true;
      limpiarIntervalo();
      setMpReconciling(false);
    };
  }, [user, vaciarCarrito, navigate]);

  const login = async (email, password) => {
    try {
      const userData = await usuariosAPI.login(email, password);
      if (userData && userData.usuario && userData.token) {
        const userWithToken = { ...userData.usuario, token: userData.token };
        localStorage.setItem('user', JSON.stringify(userWithToken));
        setUser(userWithToken);
        await setCarritoStorageForUser(userWithToken);
        toast.success('¡Bienvenido/a!');
        return { success: true };
      } else {
        toast.error('Email o contraseña incorrectos');
        return { success: false, message: 'Email o contraseña incorrectos.' };
      }
    } catch (error) {
      // Si hay respuesta del backend
      if (error?.response) {
        const msg = error.response.data?.error || error.response.data?.mensaje || '';
        if (msg.toLowerCase().includes('usuario')) {
          toast.error('Usuario no encontrado. Registrate.');
          return { success: false, message: 'Usuario no encontrado. Registrate.' };
        }
        if (msg.toLowerCase().includes('contraseña')) {
          toast.error('Contraseña incorrecta.');
          return { success: false, message: 'Contraseña incorrecta.' };
        }
        toast.error(msg || 'Error al iniciar sesión');
        return { success: false, message: msg || 'Error al iniciar sesión.' };
      } else if (error?.message && (error.message.includes('Network') || error.message.includes('timeout'))) {
        toast.error('Error de conexión. Intenta más tarde.');
        return { success: false, message: 'Error de conexión. Intenta más tarde.' };
      } else {
        toast.error('Error al iniciar sesión');
        return { success: false, message: 'Error al iniciar sesión.' };
      }
    }
  };

  const register = async (userData) => {
    try {
      const response = await usuariosAPI.create({
        ...userData,
        rol: 'cliente',
      });

      // Backend recomendado: { token, usuario }
      const payload = response?.data;
      const usuario = payload?.usuario || payload;
      const token = payload?.token;
      if (!usuario) {
        toast.error('Registro fallido: datos incompletos');
        return false;
      }

      if (!token) {
        // Caso: backend devolvió usuario existente sin token (p.ej. respuesta "Usuario ya registrado").
        // Bloquear registro y mostrar mensaje claro al usuario indicando que el email ya existe.
        if (payload?.mensaje && String(payload.mensaje).toLowerCase().includes('usuario ya registrado')) {
          toast.error('El email ya existe. Iniciá sesión o recuperá la contraseña.');
          return false;
        }

        toast.error('Registro incompleto: falta token del servidor');
        return false;
      }

      const userWithToken = { ...usuario, token };
      localStorage.setItem('user', JSON.stringify(userWithToken));
      setUser(userWithToken);
      await setCarritoStorageForUser(userWithToken);
      toast.success('¡Registro exitoso!');
      return true;
    } catch (error) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.mensaje;
      if (status === 400 || status === 409) {
        toast.error(msg || 'El email ya está registrado');
        return false;
      }
      toast.error('Error al registrarse');
      return false;
    }
  };

  const logout = () => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    localStorage.removeItem('user');
    setUser(null);
    // Cambiar el scope del carrito a guest para que no quede el del usuario anterior
    setCarritoStorageForUser(null);
    const spinnerDiv = document.createElement('div');
    spinnerDiv.style.position = 'fixed';
    spinnerDiv.style.top = 0;
    spinnerDiv.style.left = 0;
    spinnerDiv.style.width = '100vw';
    spinnerDiv.style.height = '100vh';
    spinnerDiv.style.background = 'rgba(255,255,255,0.95)';
    spinnerDiv.style.display = 'flex';
    spinnerDiv.style.flexDirection = 'column';
    spinnerDiv.style.alignItems = 'center';
    spinnerDiv.style.justifyContent = 'center';
    spinnerDiv.style.zIndex = 9999;
    let spinnerColor = '#ffb6d5', spinnerTop = '#ad1457', title = '', subtitle = '', titleColor = '#ad1457', subColor = '#d81b60';
    if (currentUser && currentUser.rol === 'superadmin') {
      title = '¡Hasta luego super admin!';
      subtitle = 'Cerrando sesión...';
    } else if (currentUser && currentUser.rol === 'admin') {
      title = '¡Hasta luego admin!';
      subtitle = 'Cerrando sesión...';
    } else if (currentUser) {
      spinnerColor = '#90caf9'; spinnerTop = '#1976d2'; titleColor = '#1976d2'; subColor = '#1976d2';
      title = `¡Hasta luego, ${currentUser.nombre || 'usuario'}!`;
      subtitle = 'Cerrando sesión...';
    } else {
      title = '¡Hasta luego!'; subtitle = 'Cerrando sesión...';
    }
    spinnerDiv.innerHTML = `
      <div style="margin-bottom:24px">
        <div class='spinner' style='width:60px;height:60px;border:6px solid ${spinnerColor};border-top:6px solid ${spinnerTop};border-radius:50%;animation:spin 1s linear infinite;'></div>
      </div>
      <h2 style='color:${titleColor};font-family:Montserrat,sans-serif;font-size:2rem;margin-bottom:8px;'>${title}</h2>
      <p style='color:${subColor};font-size:1.1rem;'>${subtitle}</p>
      <style>@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}</style>
    `;
    document.body.appendChild(spinnerDiv);
    setTimeout(()=>{
      document.body.removeChild(spinnerDiv);
      window.location.href = '/login';
    },5000);
  };

  const isAdmin = () => {
    return user && (user.rol === 'admin' || user.rol === 'superadmin');
  };

  const isSuperAdmin = () => {
    return user && user.rol === 'superadmin';
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAdmin,
    isSuperAdmin,
    loading,
    mpReconciling,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
