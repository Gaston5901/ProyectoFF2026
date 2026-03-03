import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const PagoExitoso = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    sessionStorage.setItem('mpPagoPendiente', '1');
    const search = location.search || '?status=approved';
    navigate(`/carrito${search}`, { replace: true });
  }, [location.search, navigate]);

  return (
    <div className="carrito-vacio">
      <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }}></div>
      <h2>Confirmando pago...</h2>
      <p>En unos segundos te llevamos a Mis Turnos.</p>
      <Link className="btn btn-primary" to="/carrito?status=approved">
        Volver a la tienda
      </Link>
    </div>
  );
};

export default PagoExitoso;
