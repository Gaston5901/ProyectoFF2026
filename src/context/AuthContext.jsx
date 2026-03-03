import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usuariosAPI, turnosAPI } from '../services/api';
import { useCarritoStore } from '../store/useCarritoStore';
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
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

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
        toast.success('¡Bienvenido/a!');
        // La navegación la maneja el componente Login.jsx
        return true;
      } else {
        toast.error('Email o contraseña incorrectos');
        return false;
      }
    } catch (error) {
      toast.error('Error al iniciar sesión');
      return false;
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
      if (!usuario || !token) {
        toast.error('Registro incompleto: falta token del servidor');
        return false;
      }

      const userWithToken = { ...usuario, token };
      localStorage.setItem('user', JSON.stringify(userWithToken));
      setUser(userWithToken);
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
    if (currentUser && (currentUser.rol === 'admin' || currentUser.rol === 'superadmin')) {
      title = '¡Adiós admin!';
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
