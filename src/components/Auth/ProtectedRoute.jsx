import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Bloquea el acceso si no hay sesión o si el rol no coincide con el requerido.
const ProtectedRoute = ({ children, adminOnly = false, superAdminOnly = false }) => {
  // Toma el usuario autenticado y el estado de carga desde el contexto.
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();

  // Mientras se recupera la sesión, muestra un loader simple.
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Si no hay usuario logueado, lo manda al login.
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Si la ruta es solo para admins y el usuario no cumple, vuelve al inicio.
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" />;
  }

  // Si la ruta es solo para superadmins y el usuario no cumple, vuelve al inicio.
  if (superAdminOnly && !isSuperAdmin()) {
    return <Navigate to="/" />;
  }

  // Si pasa todas las validaciones, renderiza la ruta solicitada.
  return children;
};

export default ProtectedRoute;
