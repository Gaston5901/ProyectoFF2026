import React from 'react';
import './ServicioModal.css';

const ServicioModal = ({ visible, onClose, onSubmit, formData, setFormData, editando }) => {
  const [loading, setLoading] = React.useState(false);
  if (!visible) return null;

  const handleSubmit = async (e) => {
    setLoading(true);
    await onSubmit(e);
    setLoading(false);
  };

  return (
    <div className="servicio-modal-backdrop" onClick={onClose}>
      <div className="servicio-modal" onClick={e => e.stopPropagation()}>
        <button className="servicio-modal-close" onClick={onClose}>&times;</button>
        <h3 style={{marginBottom:16}}>{editando ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="servicio-modal-grid">
            <div className="form-group">
              <label htmlFor="nombre-servicio-modal">Nombre del Servicio</label>
              <input id="nombre-servicio-modal" type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="precio-servicio-modal">Precio ($)</label>
              <input id="precio-servicio-modal" type="number" value={formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="duracion-servicio-modal">Duración (minutos)</label>
              <input id="duracion-servicio-modal" type="number" value={formData.duracion} onChange={e => setFormData({ ...formData, duracion: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="imagen-servicio-modal">URL Imagen</label>
              <input id="imagen-servicio-modal" type="text" value={formData.imagen} onChange={e => setFormData({ ...formData, imagen: e.target.value })} placeholder="/servicios/imagen.jpg" />
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label htmlFor="descripcion-servicio-modal">Descripción</label>
              <textarea id="descripcion-servicio-modal" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} required />
            </div>
          </div>
          <div className="servicio-modal-actions">
            <button type="submit" className="btn btn-primary" disabled={loading} style={loading ? {opacity:0.7,cursor:'not-allowed'} : {}}>
              {loading ? <span className="spinner" style={{marginRight:'8px',width:'18px',height:'18px',display:'inline-block',verticalAlign:'middle'}}></span> : null}
              {editando ? 'Actualizar' : 'Crear'} Servicio
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServicioModal;
