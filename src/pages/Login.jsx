import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    showPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    document.body.classList.add('auth-body');
    return () => document.body.classList.remove('auth-body');
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'El email es obligatorio.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) newErrors.email = 'El email no es válido.';
    if (!formData.password) newErrors.password = 'La contraseña es obligatoria.';
    else if (formData.password.length < 6) newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validationErrors = validate();
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setLoading(true);
    const MIN_SECONDS = 4; // Cambia este valor para el mínimo de segundos
    const start = Date.now();
    try {
      const success = await login(formData.email, formData.password);
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_SECONDS * 1000 - elapsed);
      if (success) {
        const user = JSON.parse(localStorage.getItem('user'));
        setTimeout(() => {
          if (user && (user.rol === 'admin' || user.rol === 'superadmin')) {
            navigate('/admin');
          } else {
            navigate('/mis-turnos');
          }
          setLoading(false);
        }, wait);
      } else {
        setTimeout(() => {
          setError('Email o contraseña incorrectos.');
          setLoading(false);
        }, wait);
      }
    } catch (err) {
      setError('Ocurrió un error al iniciar sesión.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <LogIn size={48} className="auth-icon" />
          <h1>Iniciar Sesión</h1>
          <p>Bienvenido/a de nuevo</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label id="email" className="form-label">Gmail</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {fieldErrors.email && <div className="auth-error">{fieldErrors.email}</div>}
          </div>

          <div className="form-group">
            <label id="password" className="form-label">Contraseña</label>
            <div className="password-wrapper">
              <input
                type={formData.showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                placeholder=""
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button type="button" className="toggle-password" onClick={() => setFormData({...formData, showPassword: !formData.showPassword})}>
                {formData.showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
            {fieldErrors.password && <div className="auth-error">{fieldErrors.password}</div>}
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            <LogIn size={20} />
            Iniciar Sesión
          </button>

          {loading && (
            <div className="spinner-fullscreen">
              <span className="spinner spinner-gradient">
                <svg viewBox="0 0 60 60">
                  <defs>
                    <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#d13fa0" />
                      <stop offset="100%" stopColor="#ff5ec4" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="30" cy="30" r="24"
                    fill="none"
                    stroke="url(#spinner-gradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="60 90"
                    style={{ filter: 'drop-shadow(0 2px 12px #d13fa055)' }}
                  >
                    <animateTransform attributeName="transform" type="rotate" from="0 30 30" to="360 30 30" dur="0.9s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </span>
              {/* <div style={{marginTop:18, color:'#d13fa0', fontWeight:600, fontSize:18, textShadow:'0 1px 8px #fff8'}}>Cargando...</div> */}
            </div>
          )}
          <div className="recover-link">
            <Link to="/register">¿No tenés cuenta? Registrate aquí</Link>
          </div>
        </form>

        <div className="auth-footer">
          <p>¿Olvidaste tu contraseña? <Link to="/recuperar">Recuperala aquí</Link></p>
          <p className="mt-2">
            {/* <small>Usuario de prueba: admin@turnos.com / admin123</small> */}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
