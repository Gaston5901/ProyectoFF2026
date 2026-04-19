import { useEffect, useMemo, useRef, useState } from 'react';
import { serviciosAPI } from '../services/api';
import { Sparkles, Clock, DollarSign, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import './Servicios.css';

const ITEMS_POR_PAGINA = 6;
const MAX_PAGE_BUTTONS = 10;

const Servicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const listTopRef = useRef(null);

  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    try {
      const response = await serviciosAPI.getAll();
      const data = response?.data ?? response;
      setServicios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const serviciosOrdenados = useMemo(() => {
    const list = Array.isArray(servicios) ? [...servicios] : [];
    list.sort((a, b) => String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' }));
    return list;
  }, [servicios]);

  const serviciosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const list = serviciosOrdenados;

    const listByServicio = filtroServicio === 'todos'
      ? list
      : list.filter((s) => String(s?.id || s?._id) === String(filtroServicio));

    if (!q) return listByServicio;

    return listByServicio.filter((s) => {
      const nombre = String(s?.nombre || '').toLowerCase();
      const descripcion = String(s?.descripcion || '').toLowerCase();
      return nombre.includes(q) || descripcion.includes(q);
    });
  }, [busqueda, filtroServicio, serviciosOrdenados]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroServicio]);

  const totalPaginas = Math.max(1, Math.ceil(serviciosFiltrados.length / ITEMS_POR_PAGINA));
  const start = (pagina - 1) * ITEMS_POR_PAGINA;
  const end = start + ITEMS_POR_PAGINA;
  const mostrandoDesde = serviciosFiltrados.length === 0 ? 0 : start + 1;
  const mostrandoHasta = Math.min(end, serviciosFiltrados.length);
  const serviciosPaginados = serviciosFiltrados.slice(start, end);

  const showPager = serviciosFiltrados.length > ITEMS_POR_PAGINA;

  const scrollToListTop = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  };

  const goToPage = (nextPage) => {
    const bounded = Math.min(totalPaginas, Math.max(1, Number(nextPage) || 1));
    setPagina(bounded);
    scrollToListTop();
  };

  const pagesToShow = useMemo(() => {
    const blockStart = Math.floor((pagina - 1) / MAX_PAGE_BUTTONS) * MAX_PAGE_BUTTONS + 1;
    const blockEnd = Math.min(totalPaginas, blockStart + MAX_PAGE_BUTTONS - 1);
    return Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i);
  }, [pagina, totalPaginas]);

  const blockStart = pagesToShow[0] || 1;
  const blockEnd = pagesToShow[pagesToShow.length - 1] || 1;

  const renderPager = (ariaLabel) => (
    <div className="servicios-pager" aria-label={ariaLabel}>
      <button
        type="button"
        className="servicios-page-btn"
        onClick={() => goToPage(pagina - 1)}
        disabled={pagina === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="servicios-page-numbers" role="group" aria-label="Páginas">
        {blockStart > 1 && <span className="servicios-page-ellipsis">…</span>}
        {pagesToShow.map((p) => (
          <button
            key={p}
            type="button"
            className={`servicios-page-number-btn${p === pagina ? ' is-active' : ''}`}
            onClick={() => goToPage(p)}
            aria-current={p === pagina ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        {blockEnd < totalPaginas && <span className="servicios-page-ellipsis">…</span>}
      </div>

      <button
        type="button"
        className="servicios-page-btn"
        onClick={() => goToPage(pagina + 1)}
        disabled={pagina === totalPaginas}
        aria-label="Página siguiente"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="spinner"></div>
        <p>Cargando servicios...</p>
      </div>
    );
  }

  return (
    <div className="servicios-page">
      <div className="servicios-header">
        <h1>Nuestros Servicios</h1>
        <p>Esta sección es solo de vista. Para reservar tu turno, entrá en “Reservar Turno”.</p>
      </div>

      <div className="container">
        <div className="servicios-toolbar" aria-label="Búsqueda de servicios">
          <div className="servicios-search">
            <Search size={20} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              aria-label="Buscar servicios"
            />
          </div>

          <div className="servicios-filtros" aria-label="Filtro por servicio">
            <span className="servicios-filtros-icon" aria-hidden="true">
              <Filter size={16} />
            </span>
            <select
              className="servicios-select"
              value={filtroServicio}
              onChange={(e) => {
                setFiltroServicio(e.target.value);
                setBusqueda('');
              }}
              aria-label="Filtrar por servicio"
            >
              <option value="todos">Filtro</option>
              {serviciosOrdenados.map((s, idx) => (
                <option key={s?.id || s?._id || idx} value={s?.id || s?._id}>
                  {s?.nombre || 'Servicio'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div ref={listTopRef} />

        <div className="servicios-list-header">
          <div className="servicios-summary">
            Mostrando {mostrandoDesde}-{mostrandoHasta} de {serviciosFiltrados.length}
          </div>

          <div className="servicios-pager-slot">
            {showPager && renderPager('Paginación servicios')}
          </div>

          <div className="servicios-right-slot" aria-hidden="true" />
        </div>

        <div className="servicios-grid">
          {serviciosPaginados.map((servicio, idx) => (
            <div key={servicio.id || servicio._id || idx} className="servicio-card servicio-card-home">
              <div className="service-preview-img-wrapper">
                {servicio.imagen ? (
                  <img
                    src={servicio.imagen}
                    alt={servicio.nombre}
                    className="service-preview-img"
                    style={{
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                      border: '2px solid #ffe3f2',
                      background: '#fff0fa',
                      objectFit: 'contain',
                      width: '100%',
                      height: '100%'
                    }}
                    onError={e => { e.target.onerror=null; e.target.src='https://via.placeholder.com/120x120?text=Sin+Imagen'; }}
                  />
                ) : (
                  <div className="service-preview-icon-alt"><Sparkles size={40} /></div>
                )}
              </div>
              <h3 className="service-card-title">{servicio.nombre}</h3>
              <p className="service-price">Precio: ${Number(servicio.precio || 0).toLocaleString()}</p>
              <div className="service-meta">
                <span className="service-meta-item"><Clock size={16} /> {servicio.duracion} min</span>
                <span className="service-meta-item"><DollarSign size={16} /> Seña: ${(Number(servicio.precio || 0) / 2).toLocaleString()}</span>
              </div>
              <p className="service-preview-desc">{servicio.descripcion}</p>
            </div>
          ))}
        </div>

        {showPager && (
          <div className="servicios-bottom-pager">
            {renderPager('Paginación servicios (abajo)')}
          </div>
        )}

        <div className="servicios-info">
          <div className="info-card">
            <h3>💳 Forma de Pago</h3>
            <p>
              Pagás solo el 50% de seña al reservar tu turno online mediante Mercado Pago.
              El resto se abona en el local al momento del servicio.
            </p>
          </div>
          <div className="info-card">
            <h3>📅 Cancelaciones</h3>
            <p>
              Podés cancelar tu turno con hasta 24 horas de anticipación para recibir 
              el reembolso de tu seña.
            </p>
          </div>
          <div className="info-card">
            <h3>⏰ Horarios</h3>
            <p>
              Lunes a Sábado de 9:00 a 19:00 hs. Domingos cerrado.
              Turnos cada hora según disponibilidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Servicios;
