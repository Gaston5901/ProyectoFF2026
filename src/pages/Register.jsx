import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

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
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio.';
    if (!formData.email.trim()) newErrors.email = 'El email es obligatorio.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) newErrors.email = 'El email no es válido.';
    if (!formData.telefono.trim()) newErrors.telefono = 'El teléfono es obligatorio.';
    else if (formData.telefono.trim().length < 6) newErrors.telefono = 'El teléfono debe tener al menos 6 caracteres.';
    if (!formData.password) newErrors.password = 'La contraseña es obligatoria.';
    else if (formData.password.length < 6) newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Debes confirmar la contraseña.';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    const { confirmPassword, ...userData } = formData;
    const success = await register(userData);
    if (success) {
      navigate('/mis-turnos');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <UserPlus size={48} className="auth-icon" />
          <h1>Crear Cuenta</h1>
          <p>Registrate para reservar tus turnos</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label id="nombre" className="form-label">Nombre de Usuario (Apodo)</label>
            <input
              type="text"
              name="nombre"
              className="form-input"
              placeholder="Tu nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
            {errors.nombre && <div className="auth-error">{errors.nombre}</div>}
          </div>

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
            {errors.email && <div className="auth-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label id="telefono" className="form-label">Teléfono</label>
            <input
              type="tel"
              name="telefono"
              className="form-input"
              placeholder="+54 11 1234-5678"
              value={formData.telefono}
              onChange={handleChange}
              required
            />
            {errors.telefono && <div className="auth-error">{errors.telefono}</div>}
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label id="password" className="form-label">Contraseña</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            <span
              style={{ position: 'absolute', right: '16px', top: '73%', transform: 'translateY(-40%)', cursor: 'pointer', background: 'transparent', padding: 0 }}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </span>
            {errors.password && <div className="auth-error">{errors.password}</div>}
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label id="confirmPassword" className="form-label">Confirmar Contraseña</label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              className="form-input"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
            />
            <span
              style={{ position: 'absolute', right: '16px', top: '74%', transform: 'translateY(-40%)', cursor: 'pointer', background: 'transparent', padding: 0 }}
              onClick={() => setShowConfirmPassword((v) => !v)}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </span>
            {errors.confirmPassword && <div className="auth-error">{errors.confirmPassword}</div>}
          </div>

          <button type="submit" className="btn btn-primary auth-submit">
            <UserPlus size={20} />
            Crear Cuenta
          </button>
        </form>

        <div className="auth-footer">
          <p>¿Ya tenés cuenta? <Link to="/login">Iniciá sesión aquí</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
