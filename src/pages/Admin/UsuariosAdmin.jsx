import { useState, useEffect } from 'react';
import { usuariosAPI } from '../../services/api';
import { Users, Search, Shield, User as UserIcon, Eye } from 'lucide-react';
import './Admin.css';

const UsuariosAdmin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [usuarioDetalle, setUsuarioDetalle] = useState(null);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const res = await usuariosAPI.getAll();
      setUsuarios(res.data.sort((a, b) => (b.id || 0) - (a.id || 0)));
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const admin = usuarios.find((u) => u.rol === 'admin');
  const clientes = usuarios.filter((u) => u.rol !== 'admin');
  const clientesFiltrados = clientes.filter((u) => {
    const cumpleRol = filtroRol === 'todos' || u.rol === filtroRol;
    const cumpleBusqueda = busqueda === '' ||
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.telefono && u.telefono.includes(busqueda));
    return cumpleRol && cumpleBusqueda;
  });

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="spinner"></div>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><Users size={40} /> Gestión de Usuarios</h1>
        <p>Visualiza todos los usuarios registrados</p>
      </div>

      <div className="container">
        <div className="turnos-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="filtros">
            <button className={`filtro-btn ${filtroRol === 'todos' ? 'active' : ''}`} onClick={() => setFiltroRol('todos')}>Todos</button>
            <button className={`filtro-btn ${filtroRol === 'cliente' ? 'active' : ''}`} onClick={() => setFiltroRol('cliente')}>Clientes</button>
            <button className={`filtro-btn ${filtroRol === 'admin' ? 'active' : ''}`} onClick={() => setFiltroRol('admin')}>Admins</button>
          </div>
        </div>

        {/* Admin destacado arriba */}
        {admin && (
          <div style={{display:'flex',justifyContent:'center',marginBottom:'16px'}}>
            <div className="usuario-card" style={{
              border: '2px solid gold',
              boxShadow: '0 0 12px #ffe06699',
              background: 'linear-gradient(90deg, #fffbe6 0%, #fff 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 8vw',
              minWidth: '160px',
              maxWidth: '95vw',
              width: '100%',
              minHeight: '54px',
              borderRadius: '16px',
              boxSizing: 'border-box',
            }}>
              <Shield size={28} color="#d4af37" style={{marginBottom:'2px'}} />
              <h2 style={{fontSize:'1.1rem',marginBottom:'2px',color:'#d13fa0',fontWeight:700}}>Triny</h2>
              <span className="badge badge-admin" style={{ background: 'gold', color: '#333', fontWeight: 'bold', padding: '4px 10px', borderRadius: '14px', fontSize: '0.98rem', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span role="img" aria-label="corona" style={{fontSize:'1em',marginRight:'4px'}}>👑</span>Admin
              </span>
            </div>
          </div>
        )}

        {/* Lista de clientes */}
        <div className="usuarios-grid" style={{display:'flex',flexDirection:'column',gap:'7px',width:'100%'}}>
          {clientesFiltrados.length > 0 ? (
            clientesFiltrados.map((usuario) => (
              <div
                key={usuario.id}
                className="usuario-card"
                style={{ border: '1.2px solid #38bdf8', boxShadow: '0 0 2px #b6eaff33', display:'flex',alignItems:'center',justifyContent:'space-between',padding:'2px 8px',marginBottom:'0',borderRadius:'8px',background:'#fff',width:'100%',boxSizing:'border-box',minHeight:'38px' }}
              >
                <div style={{display:'flex',alignItems:'center',gap:'8px',width:'100%'}}>
                  <UserIcon size={16} />
                  <span style={{fontSize:'0.95rem',fontWeight:500,display:'flex',alignItems:'center'}}>{usuario.nombre || '(Sin nombre)'}</span>
                  <span className="badge badge-cliente" style={{ background: '#e0f7fa', color: '#0288d1', fontWeight: 'bold', borderRadius: '8px', padding: '2px 7px', fontSize: '0.9rem', marginLeft:'6px',height:'22px',display:'flex',alignItems:'center' }}>Cliente</span>
                  <button className="btn-accion ver" title="Ver detalles" style={{background:'none',border:'none',cursor:'pointer',padding:'2px',marginLeft:'auto',display:'flex',alignItems:'center',height:'22px'}} onClick={() => setUsuarioDetalle(usuario)}>
                    <Eye size={18} style={{verticalAlign:'middle'}} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="no-data">No se encontraron usuarios</p>
          )}
        </div>

        {/* Modal de detalles de cliente */}
        {usuarioDetalle && (
          <div className="modal-usuario-detalle" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
            <div style={{background:'#fff',padding:'22px 16px',borderRadius:'14px',minWidth:'220px',maxWidth:'95vw',boxShadow:'0 4px 32px #0002',position:'relative',display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
              <button onClick={()=>setUsuarioDetalle(null)} style={{position:'absolute',top:8,right:12,fontSize:'1.3rem',background:'none',border:'none',cursor:'pointer',color:'#d13fa0'}}>×</button>
              <UserIcon size={28} style={{color:'#38bdf8',marginBottom:'4px'}} />
              <h2 style={{marginBottom:'6px',fontSize:'1.1rem',fontWeight:600,color:'#d13fa0'}}>{usuarioDetalle.nombre || '(Sin nombre)'}</h2>
              <div style={{width:'100%',background:'#e0f7fa',borderRadius:'8px',padding:'7px 10px',marginBottom:'4px',display:'flex',flexDirection:'column',gap:'4px'}}>
                <p style={{margin:'0',fontSize:'0.98rem',color:'#ff9800'}}><strong>Gmail:</strong> {usuarioDetalle.email}</p>
                <p style={{margin:'0',fontSize:'0.98rem',color:'#059669'}}><strong>Celular:</strong> {usuarioDetalle.telefono || '(Sin cargar)'}</p>
              </div>
              <span className="badge badge-cliente" style={{ background: '#e0f7fa', color: '#0288d1', fontWeight: 'bold', borderRadius: '8px', padding: '4px 12px', fontSize: '1rem', marginTop:'2px' }}>Cliente</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsuariosAdmin;
