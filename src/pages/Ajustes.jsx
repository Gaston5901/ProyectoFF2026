import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Eye, EyeOff, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usuariosAPI } from '../services/api';
import './Auth.css';

const Ajustes = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrent: false,
    showNew: false,
    showConfirm: false,
  });

  useEffect(() => {
    document.body.classList.add('auth-body');
    return () => document.body.classList.remove('auth-body');
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.currentPassword) return 'La contraseña actual es obligatoria.';
    if (!form.newPassword) return 'La nueva contraseña es obligatoria.';
    if (form.newPassword.length < 6) return 'La nueva contraseña debe tener al menos 6 caracteres.';
    if (form.newPassword !== form.confirmPassword) return 'Las contraseñas no coinciden.';
    if (form.newPassword === form.currentPassword) return 'La nueva contraseña debe ser distinta a la actual.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      await usuariosAPI.changePassword(form.currentPassword, form.newPassword);
      toast.success('Contraseña actualizada. Iniciá sesión nuevamente.');
      // Seguridad: luego de cambiar contraseña, forzamos re-login
      logout();
      navigate('/login');
    } catch (error) {
      const backendMsg = error?.response?.data?.mensaje || error?.response?.data?.error;
      toast.error(backendMsg || 'No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Settings size={48} className="auth-icon" />
          <h1>Ajustes</h1>
          <p>Cambiar contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--white)' }}>Contraseña actual</label>
            <div className="password-wrapper">
              <input
                type={form.showCurrent ? 'text' : 'password'}
                name="currentPassword"
                className="form-input"
                value={form.currentPassword}
                onChange={onChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setForm((p) => ({ ...p, showCurrent: !p.showCurrent }))}
                aria-label={form.showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {form.showCurrent ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--white)' }}>Nueva contraseña</label>
            <div className="password-wrapper">
              <input
                type={form.showNew ? 'text' : 'password'}
                name="newPassword"
                className="form-input"
                value={form.newPassword}
                onChange={onChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setForm((p) => ({ ...p, showNew: !p.showNew }))}
                aria-label={form.showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {form.showNew ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--white)' }}>Repetir nueva contraseña</label>
            <div className="password-wrapper">
              <input
                type={form.showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                className="form-input"
                value={form.confirmPassword}
                onChange={onChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setForm((p) => ({ ...p, showConfirm: !p.showConfirm }))}
                aria-label={form.showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {form.showConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Ajustes;
