import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { LogIn, Mail, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/apiBaseUrl.js';


const RecuperarPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('auth-body');
    return () => document.body.classList.remove('auth-body');
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  // Autocompletar token desde la URL si existe
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
      setStep(2);
    }
  }, [location.search]);

  const solicitar = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/usuarios/recuperar-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email })
      });
      if (!res.ok) throw new Error('Error');
      toast.success('Código enviado al email');
      setStep(2);
    } catch {
      toast.error('No se pudo enviar el código');
    } finally { setLoading(false); }
  };

  const restablecer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/usuarios/resetear-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, token, password: newPassword })
      });
      if (!res.ok) throw new Error('Error');
      toast.success('Contraseña restablecida');
      setStep(3);
      setProgress(0);
      setShowSuccess(false);
      // Animación de barra de carga
      let percent = 0;
      const interval = setInterval(() => {
        percent += 2;
        setProgress(percent);
        if (percent >= 100) {
          clearInterval(interval);
          setShowSuccess(true);
        }
      }, 70);
    } catch {
      toast.error('Error al restablecer');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-container auth-container-recover">
      <div className="auth-card">
        <div className="auth-header">
          <LogIn size={48} className="auth-icon" />
          <h1>Recuperar Contraseña</h1>
          <p>{step === 1 ? 'Ingresa tu email' : step === 2 ? 'Código y nueva contraseña' : 'Listo'}</p>
        </div>
        {step === 1 && (
          <form onSubmit={solicitar} className="auth-form">
            <div className="form-group">
              <label className="form-label" style={{color: 'white'}} >Email</label>
              <input type="email" className="form-input" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Enviando...' : 'Enviar Código'}</button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={restablecer} className="auth-form">
            <div className="form-group">
              <label className="form-label" style={{color: 'white'}}>Código</label>
              <input type="text" className="form-input" value={token} onChange={e=>setToken(e.target.value)} required />
            </div>
            <div className="form-group" style={{position:'relative'}}>
              <label className="form-label" style={{color: 'white'}}>Nueva Contraseña</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={newPassword}
                onChange={e=>setNewPassword(e.target.value)}
                required
                style={{paddingRight:36}}
              />
              <button
                type="button"
                onClick={()=>setShowPassword(v=>!v)}
                style={{
                  position:'absolute',
                  right:10,
                  top:49,
                  background:'none',
                  border:'none',
                  cursor:'pointer',
                  padding:0
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={22} color="#e94057" /> : <Eye size={22} color="#e94057" />}
              </button>
            </div>
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Procesando...' : 'Restablecer'}</button>
          </form>
        )}
        {step === 3 && (
          <div style={{textAlign:'center', padding:'20px'}}>
            {!showSuccess ? (
              <div style={{width:'100%', maxWidth:320, margin:'40px auto'}}>
                <div style={{background:'#eee', borderRadius:8, height:18, overflow:'hidden', boxShadow:'0 1px 4px #0001'}}>
                  <div style={{height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#e94057,#8a2387)', transition:'width 0.2s', borderRadius:8}}></div>
                </div>
                <div style={{marginTop:8, fontWeight:600, color:'#e94057', fontSize:18}}>{progress}%</div>
                <div style={{marginTop:16, color:'#888'}}>Procesando...</div>
              </div>
            ) : (
              <>
                <Mail size={48} style={{color:'white'}} />
                <p style={{color:'white' }}>Contraseña actualizada. Ahora podés{' '}
                  <Link to="/login" style={{
                    color: '#e94057',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    fontSize: 18
                  }}>iniciar sesión</Link>.
                </p>
              </>
            )}
          </div>
        )}
        <div className="auth-footer">
          <Link to="/login">Volver a Login</Link>
        </div>
      </div>
    </div>
  );
};

export default RecuperarPassword;
