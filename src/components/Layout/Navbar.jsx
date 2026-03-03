import { NavLink, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCarrito } from '../../store/useCarritoStore';
import { Menu, X, ShoppingCart, User, LogOut, LayoutDashboard, Calendar, TrendingUp, FileText, Image as ImageIcon } from 'lucide-react';
import './Navbar.css';
import './NavbarAdmin.css';
import BadgeTurnosEnProceso from '../Admin/BadgeTurnosEnProceso';

const Navbar = () => {

  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { cantidadItems } = useCarrito();
  const [sidebarHover, setSidebarHover] = useState(false);
  // Para admin mobile
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 900 && window.innerWidth <= 1200);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
      setIsTablet(window.innerWidth > 900 && window.innerWidth <= 1200);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const handleSidebarOpen = () => {
    setSidebarClosing(false);
    setShowMobileSidebar(true);
  };
  const handleSidebarClose = () => {
    setSidebarClosing(true);
    setTimeout(() => {
      setShowMobileSidebar(false);
      setSidebarClosing(false);
    }, 280);
  };

  if (user && isAdmin()) {
    // Sidebar: desktop expandido, tablet colapsado, móvil hamburguesa
    const sidebarWidth = sidebarHover || isTablet ? 220 : 56;
    return (
      <>
        <nav className="navbar">
          <div className="navbar-container">
            <Link to="/" className="navbar-logo" style={{display: 'flex', alignItems: 'center', height: '54px'}}>
              <div style={{height: '44px', width: '44px', overflow: 'hidden', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(233,30,99,0.15)'}}>
                <img src="/image copy 3.png" alt="Logo Nav" style={{height: '1000%', width: '1000%', objectFit: 'contain', borderRadius: '50%', filter: 'invert(1) drop-shadow(0 0 4px #fff) brightness(4.2)'}} />
              </div>
              <span className="logo-text" style={{marginLeft: '10px'}}>Delfina Nails Studio</span>
            </Link>
            {(isMobile || isTablet) && (
              <button
                className={`navbar-toggle${showMobileSidebar ? ' open' : ''}`}
                onClick={showMobileSidebar ? handleSidebarClose : handleSidebarOpen}
                style={{marginLeft: 'auto'}}
                aria-label={showMobileSidebar ? 'Cerrar menú' : 'Abrir menú'}
              >
                <span className="menu-icon">
                  {showMobileSidebar ? <X size={24} /> : <Menu size={24} />}
                </span>
              </button>
            )}
          </div>
        </nav>
        {/* Sidebar para escritorio y tablet */}
        {!isMobile && (
          <aside className={`admin-sidebar${sidebarHover || isTablet ? ' expanded' : ' collapsed'}`}
            onMouseEnter={() => !isTablet && setSidebarHover(true)}
            onMouseLeave={() => !isTablet && setSidebarHover(false)}
          >
            <div className="sidebar-header">
              <span style={{fontWeight: 'bold', fontSize: '1.2rem'}}>Admin</span>
            </div>
            <nav className="sidebar-nav">
              <NavLink to="/admin/panel" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}> <LayoutDashboard size={20} /> {sidebarHover && <span style={{marginLeft:8}}>Panel</span>}</NavLink>
              <NavLink to="/admin/panel-trabajo" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}> <Menu size={20} /> {sidebarHover && <span style={{marginLeft:8}}>Trabajo</span>}</NavLink>
              <NavLink to="/admin/turnos" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}> <Calendar size={20} /> {sidebarHover && <span style={{marginLeft:8}}>Turnos</span>}</NavLink>
              <NavLink to="/admin/historial" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}> <FileText size={20} /> {sidebarHover && <span style={{marginLeft:8}}>Historial</span>}</NavLink>
              <NavLink to="/admin/estadisticas" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}> <TrendingUp size={20} /> {sidebarHover && <span style={{marginLeft:8}}>Estadísticas</span>}</NavLink>
              <NavLink to="/admin/servicios-admin" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}> <ShoppingCart size={20} /> {sidebarHover && <span style={{marginLeft:8}}>Servicios</span>}</NavLink>
              <NavLink to="/admin/editar-carrusel" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}> <ImageIcon size={20} /> {sidebarHover && <span style={{marginLeft:8}}>Editar Carrusel</span>}</NavLink>
              <NavLink to="/admin/editar-horarios" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}> <Calendar size={20} /> {sidebarHover && <span style={{marginLeft:8}}>Actualizar Horarios</span>}</NavLink>
              <NavLink to="/admin/usuarios" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}> <User size={20} /> {sidebarHover && <span style={{marginLeft:8}}>Usuarios</span>}</NavLink>
            </nav>
            <button className="sidebar-logout" onClick={logout}>
              <LogOut size={18} />
              {sidebarHover && <span>Salir</span>}
            </button>
          </aside>
        )}
        {/* Sidebar para móvil (overlay) */}
        {isMobile && showMobileSidebar && (
          <div
            style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 200, transition: 'background 0.2s'}}
            onClick={handleSidebarClose}
          >
            <aside
              className={`admin-sidebar expanded${sidebarClosing ? ' closing' : ''}`}
              style={{position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 201, boxShadow: '2px 0 16px rgba(0,0,0,0.18)'}}
              onClick={e => e.stopPropagation()}
            >
              <div className="sidebar-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{fontWeight: 'bold', fontSize: '1.2rem'}}>Admin</span>
                <button onClick={handleSidebarClose} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}><X size={24} /></button>
              </div>
              <nav className="sidebar-nav">
                <NavLink to="/admin/panel" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => { handleSidebarClose(); window.scrollTo({top:0,behavior:'smooth'}); }}> <LayoutDashboard size={20} /> <span style={{marginLeft:8}}>Panel</span></NavLink>
                <NavLink to="/admin/panel-trabajo" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => { handleSidebarClose(); window.scrollTo({top:0,behavior:'smooth'}); }}> <Menu size={20} /> <span style={{marginLeft:8}}>Trabajo</span></NavLink>
                <NavLink to="/admin/turnos" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => { handleSidebarClose(); window.scrollTo({top:0,behavior:'smooth'}); }}> <Calendar size={20} /> <span style={{marginLeft:8}}>Turnos</span></NavLink>
                <NavLink to="/admin/historial" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => { handleSidebarClose(); window.scrollTo({top:0,behavior:'smooth'}); }}> <FileText size={20} /> <span style={{marginLeft:8}}>Historial</span></NavLink>
                <NavLink to="/admin/estadisticas" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => { handleSidebarClose(); window.scrollTo({top:0,behavior:'smooth'}); }}> <TrendingUp size={20} /> <span style={{marginLeft:8}}>Estadísticas</span></NavLink>
                <NavLink to="/admin/servicios-admin" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => { handleSidebarClose(); window.scrollTo({top:0,behavior:'smooth'}); }}> <ShoppingCart size={20} /> <span style={{marginLeft:8}}>Servicios</span></NavLink>
                <NavLink to="/admin/editar-carrusel" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => { handleSidebarClose(); window.scrollTo({top:0,behavior:'smooth'}); }}> <ImageIcon size={20} style={{marginRight:8}} /> <span>Editar Carrusel</span></NavLink>
                <NavLink to="/admin/editar-horarios" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => { handleSidebarClose(); window.scrollTo({top:0,behavior:'smooth'}); }}> <Calendar size={20} /> <span style={{marginLeft:8}}>Actualizar Horarios</span></NavLink>
                <NavLink to="/admin/usuarios" className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => { handleSidebarClose(); window.scrollTo({top:0,behavior:'smooth'}); }}> <User size={20} /> <span style={{marginLeft:8}}>Usuarios</span></NavLink>
              </nav>
              <button className="sidebar-logout" onClick={() => { logout(); handleSidebarClose(); }}>
                <LogOut size={18} />
                <span>Salir</span>
              </button>
            </aside>
          </div>
        )}
        <div style={{marginLeft: !isMobile ? sidebarWidth : 0, transition: 'margin-left 0.2s cubic-bezier(.4,0,.2,1)'}}>
          {/* Aquí va el contenido principal de la página */}
        </div>
      </>
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" style={{display: 'flex', alignItems: 'center', height: '54px'}}>
          <div style={{height: '44px', width: '44px', overflow: 'hidden', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(233,30,99,0.15)'}}>
            <img src="/image copy 3.png" alt="Logo Nav" style={{height: '1000%', width: '1000%', objectFit: 'contain', borderRadius: '50%', filter: 'invert(1) drop-shadow(0 0 4px #fff) brightness(4.2)'}} />
          </div>
          <span className="logo-text" style={{marginLeft: '10px'}}>Delfina Nails Studio</span>
        </Link>
        <div className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          {(!user || !isAdmin()) && (
            <>
              <NavLink end to="/" className={({isActive}) => `navbar-link ${isActive ? 'active' : ''}`} onClick={() => { setIsOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>
                Inicio
              </NavLink>
              <NavLink to="/servicios" className={({isActive}) => `navbar-link ${isActive ? 'active' : ''}`} onClick={() => { setIsOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>
                Servicios
              </NavLink>
              <NavLink to="/reservar" className={({isActive}) => `navbar-link ${isActive ? 'active' : ''}`} onClick={() => { setIsOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>
                Reservar Turno
              </NavLink>
            </>
          )}
          {user ? (
            <>
              {!isAdmin() && (
                <NavLink to="/mis-turnos" className={({isActive}) => `navbar-link ${isActive ? 'active' : ''}`} onClick={() => { setIsOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>
                  Mis Turnos
                </NavLink>
              )}
              {!isAdmin() && (
                <NavLink to="/carrito" className={({isActive}) => `navbar-link cart-link ${isActive ? 'active' : ''}`} onClick={() => { setIsOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>
                  <ShoppingCart size={20} />
                  {cantidadItems > 0 && <span className="cart-badge">{cantidadItems}</span>}
                </NavLink>
              )}
              <div className="navbar-user">
                <User size={18} />
                <span>{user.nombre}</span>
              </div>
              <button className="navbar-link logout-btn" onClick={logout}>
                <LogOut size={18} />
                Salir
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({isActive}) => `navbar-link ${isActive ? 'active' : ''}`} onClick={() => { setIsOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>
                Iniciar Sesión
              </NavLink>
              <NavLink to="/nosotros" className={({isActive}) => `btn btn-primary navbar-btn ${isActive ? 'active' : ''}`} onClick={() => { setIsOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }}>
                Nosotros
              </NavLink>
            </>
          )}
        </div>
        <button className="navbar-toggle" onClick={toggleMenu}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
