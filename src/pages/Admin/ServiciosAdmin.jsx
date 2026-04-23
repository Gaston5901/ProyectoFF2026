import { useState, useEffect } from 'react';
import { serviciosAPI } from '../../services/api';
import { Package, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import './Admin.css';

import ServicioModal from './ServicioModal';

const ServiciosAdmin = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    descripcion: '',
    duracion: '',
    imagen: '',
  });

  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    try {
      const res = await serviciosAPI.getAll();
      setServicios(res.data);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        precio: parseFloat(formData.precio),
        duracion: parseInt(formData.duracion),
      };

      if (editando) {
        await serviciosAPI.update(editando.id, data);
        toast.success('Servicio actualizado');
      } else {
        await serviciosAPI.create(data);
        toast.success('Servicio creado');
      }

      resetForm();
      cargarServicios();
    } catch (error) {
      const msg = error?.response?.data?.mensaje || 'Error al guardar servicio';
      toast.error(msg);
      console.error(error);
    }
  };

  const handleEditar = (servicio) => {
    setEditando(servicio);
    setFormData({
      nombre: servicio.nombre,
      precio: servicio.precio.toString(),
      descripcion: servicio.descripcion,
      duracion: servicio.duracion.toString(),
      imagen: servicio.imagen || '',
    });
    setMostrarForm(true);
  };

  const handleEliminar = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar servicio?'
      ,text: 'Esta acción no se puede deshacer.'
      ,icon: 'warning'
      ,showCancelButton: true
      ,confirmButtonText: 'Sí, eliminar'
      ,cancelButtonText: 'Cancelar'
      ,confirmButtonColor: '#d13fa0'
      ,cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) return;

    try {
      const resp = await serviciosAPI.delete(id);
      const msg = resp?.data?.mensaje || 'Servicio eliminado';
      toast.success(msg);
      cargarServicios();
    } catch (error) {
      const msg = error?.response?.data?.mensaje || 'Error al eliminar servicio';
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', precio: '', descripcion: '', duracion: '', imagen: '' });
    setEditando(null);
    setMostrarForm(false);
  };

  useEffect(() => {
    setPage(1);
  }, [busqueda]);

  const serviciosFiltrados = servicios
    .filter((s) =>
      String(s?.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      String(s?.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
    )
    .slice()
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));

  const perPage = 6;
  const total = serviciosFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginados = serviciosFiltrados.slice(start, end);
  const mostrandoDesde = total === 0 ? 0 : start + 1;
  const mostrandoHasta = Math.min(end, total);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="spinner"></div>
        <p>Cargando servicios...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><Package size={40} /> Gestión de Servicios</h1>
        <p>Crea, edita y administra los servicios del estudio</p>
      </div>

      <div className="container">
        <div className="turnos-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Buscar servicio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setMostrarForm(!mostrarForm); }}>
            <Plus size={20} /> Nuevo Servicio
          </button>
        </div>

        <ServicioModal
          visible={mostrarForm}
          onClose={resetForm}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          editando={editando}
        />

        <div className="servicios-table-frame">
          <div className="turnos-list-header">
            <div className="turnos-summary">
              Mostrando {mostrandoDesde}-{mostrandoHasta} de {total}
            </div>
            {totalPages > 1 && (
              <div className="turnos-pager" aria-label="Paginación servicios">
                <button
                  type="button"
                  className="turnos-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="turnos-page-indicator">
                  {page}/{totalPages}
                </span>
                <button
                  type="button"
                  className="turnos-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          {total > 0 ? (
            <div className="turnos-table servicios-table" role="table" aria-label="Listado de servicios">
              <div className="turnos-row turnos-row-header" role="row">
                <div className="turnos-cell cell-servicio" role="columnheader">
                  <span className="turnos-num turnos-num-header">N°</span>
                  <span>Servicio</span>
                </div>
                <div className="turnos-cell cell-precio" role="columnheader">Precio</div>
                <div className="turnos-cell cell-duracion" role="columnheader">Duración</div>
                <div className="turnos-cell cell-opciones" role="columnheader">Acciones</div>
              </div>

              {paginados.map((servicio, idx) => {
                const rowNum = start + idx + 1;
                return (
                  <div key={servicio.id} className="turnos-row" role="row">
                    <div className="turnos-cell cell-servicio" role="cell">
                      <span className="turnos-num">{rowNum}</span>
                      <div className="servicios-nombre-wrap">
                        <span className="turnos-servicio-nombre">{servicio.nombre}</span>
                        <span className="servicios-desc">{servicio.descripcion}</span>
                      </div>
                    </div>

                    <div className="turnos-cell cell-precio" role="cell">
                      <span className="servicios-price">${servicio.precio?.toLocaleString?.() ?? servicio.precio}</span>
                    </div>

                    <div className="turnos-cell cell-duracion" role="cell">
                      <span className="servicios-duration">{servicio.duracion} min</span>
                    </div>

                    <div className="turnos-cell cell-opciones" role="cell">
                      <div className="servicios-actions">
                        <button
                          className="turnos-editar-btn servicios-action-btn"
                          onClick={() => handleEditar(servicio)}
                          title="Editar"
                          aria-label="Editar"
                          type="button"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="turnos-editar-btn servicios-action-btn is-delete"
                          onClick={() => handleEliminar(servicio.id)}
                          title="Eliminar"
                          aria-label="Eliminar"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-data">No se encontraron servicios</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiciosAdmin;
