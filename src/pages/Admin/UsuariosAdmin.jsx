import { useEffect, useMemo, useState } from 'react';
import { serviciosAPI, turnosAPI, usuariosAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Search,
  Shield,
  User as UserIcon,
  Eye,
  Plus,
  Pencil,
  Ban,
  CheckCircle2,
  EyeOff,
  RotateCcw,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import './Admin.css';

const ITEMS_POR_PAGINA = 10;
const DIAS_INACTIVIDAD = 50;

const USUARIOS_FILTROS = [
  'ultimos_5',
  'todos',
  'clientes',
  'clientes_activos',
  'clientes_inactivos',
  'admins',
  'admins_suspendidos',
  'ocultos',
];

const getId = (obj) => String(obj?.id || obj?._id || '');

const getTurnoPagoId = (turno) => {
  const pagoId = turno?.pagoId ?? turno?.pago_id;
  return String(pagoId || '').trim();
};

const parseDateSafe = (value) => {
  if (!value) return null;
  const d = new Date(value);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(d.getTime())) return null;
  return d;
};

const buildTurnoDateTime = (turno) => {
  const fecha = String(turno?.fecha || '').trim();
  if (!fecha) return null;
  const hora = String(turno?.hora || '00:00').trim();
  return parseDateSafe(`${fecha}T${hora}:00`);
};

const formatEstadoLabel = (value) => String(value || '').split('_').join(' ').toUpperCase();

const buildTurnoDateTimeSafe = (turno) => {
  const fechaRaw = String(turno?.fecha || '').trim();
  if (!fechaRaw) return null;
  const fecha = fechaRaw.includes('T') ? fechaRaw.slice(0, 10) : fechaRaw;
  const hora = String(turno?.hora || '00:00').trim();
  return parseDateSafe(`${fecha}T${hora}:00`);
};

const getTurnoEstadoUI = (turno) => {
  const ahora = new Date();
  const fechaTurno = buildTurnoDateTimeSafe(turno);

  let estadoKey = String(turno?.estado || 'pendiente').toLowerCase();
  let estadoColor = '#1976d2';
  let infoDinero = '';

  if (estadoKey === 'rechazado') {
    estadoColor = '#a020f0';
    infoDinero = 'Este turno fue rechazado por el administrador. El cliente puede reservar nuevamente este horario.';
  } else if (
    estadoKey === 'completado' &&
    String(turno?.registroEstadistica || '').toLowerCase() === 'seña' &&
    fechaTurno &&
    fechaTurno < ahora
  ) {
    estadoKey = 'expirado';
    estadoColor = '#ff9800';
    infoDinero = 'Solo se recibió la seña, el cliente no asistió.';
  } else if (estadoKey === 'completado' && String(turno?.registroEstadistica || '').toLowerCase() === 'seña') {
    estadoKey = 'cancelado';
    estadoColor = '#e53935';
    infoDinero = 'Solo se recibió la seña, el cliente no completó el pago.';
  } else if (estadoKey === 'cancelado') {
    estadoColor = '#e53935';
  } else if (estadoKey === 'expirado' && String(turno?.registroEstadistica || '').toLowerCase() === 'seña') {
    estadoColor = '#ff9800';
    infoDinero = 'Solo se recibió la seña, el cliente no asistió.';
  } else if (estadoKey === 'expirado') {
    estadoColor = '#ff9800';
  } else if (estadoKey === 'completado') {
    estadoColor = '#388e3c';
    infoDinero = 'El cliente pagó el total del servicio.';
  } else if (estadoKey === 'confirmado') {
    estadoColor = '#1976d2';
    infoDinero = 'Turno pendiente de pago final.';
  } else if (estadoKey === 'en_proceso') {
    estadoColor = '#7c3aed';
  } else if (estadoKey === 'pendiente') {
    estadoColor = '#1976d2';
  }

  return {
    estadoKey,
    estadoLabel: formatEstadoLabel(estadoKey),
    estadoColor,
    infoDinero,
  };
};

function ModalUsuarioDetalle({ usuario, turnosUsuario, serviciosMap, estadoCuenta, onClose }) {
  const [paginaTurnos, setPaginaTurnos] = useState(1);
  const [filtroHistorial, setFiltroHistorial] = useState('todos');
  const itemsPorPagina = 6;

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    setPaginaTurnos(1);
  }, [usuario?.id, usuario?._id]);

  useEffect(() => {
    setPaginaTurnos(1);
  }, [filtroHistorial]);

  const cerrarOverlay = (e) => {
    if (e.target.classList.contains('modal-usuario-overlay')) {
      onClose();
    }
  };

  const turnosOrdenados = useMemo(() => {
    const arr = Array.isArray(turnosUsuario) ? [...turnosUsuario] : [];
    arr.sort((a, b) => {
      const da = buildTurnoDateTime(a) || parseDateSafe(a?.createdAt) || new Date(0);
      const db = buildTurnoDateTime(b) || parseDateSafe(b?.createdAt) || new Date(0);
      return db.getTime() - da.getTime();
    });
    return arr;
  }, [turnosUsuario]);

  const resumenPagos = useMemo(() => {
    const ignoreEstados = new Set(['rechazado']);
    let totalAbonadoNeto = 0;
    let pagosSumados = 0;

    (Array.isArray(turnosOrdenados) ? turnosOrdenados : []).forEach((t) => {
      const monto = typeof t?.montoPagado === 'number' ? t.montoPagado : 0;
      if (!monto || monto <= 0) return;

      const estado = String(t?.estado || '').toLowerCase();
      const seniaDevuelta = Boolean(t?.seniaDevuelta);

      if (seniaDevuelta) {
        return;
      }

      if (ignoreEstados.has(estado)) return;

      totalAbonadoNeto += monto;
      pagosSumados += 1;
    });

    return {
      totalAbonadoNeto,
      pagosSumados,
    };
  }, [turnosOrdenados]);

  const resumenEstados = useMemo(() => {
    const counts = {
      completado: 0,
      confirmado: 0,
      cancelado: 0,
      expirado: 0,
      rechazado: 0,
    };

    (Array.isArray(turnosOrdenados) ? turnosOrdenados : []).forEach((t) => {
      const ui = getTurnoEstadoUI(t);
      if (ui.estadoKey === 'completado') counts.completado += 1;
      if (ui.estadoKey === 'confirmado') counts.confirmado += 1;
      if (ui.estadoKey === 'cancelado') counts.cancelado += 1;
      if (ui.estadoKey === 'expirado') counts.expirado += 1;
      if (ui.estadoKey === 'rechazado') counts.rechazado += 1;
    });

    return counts;
  }, [turnosOrdenados]);

  const turnosFiltrados = useMemo(() => {
    if (filtroHistorial === 'todos') return turnosOrdenados;
    return (Array.isArray(turnosOrdenados) ? turnosOrdenados : []).filter(
      (t) => getTurnoEstadoUI(t).estadoKey === filtroHistorial
    );
  }, [turnosOrdenados, filtroHistorial]);

  const totalPaginas = Math.max(1, Math.ceil(turnosFiltrados.length / itemsPorPagina));
  const turnosPaginados = turnosFiltrados.slice(
    (paginaTurnos - 1) * itemsPorPagina,
    paginaTurnos * itemsPorPagina
  );

  const start = (paginaTurnos - 1) * itemsPorPagina;
  const end = start + itemsPorPagina;
  const mostrandoDesde = turnosFiltrados.length === 0 ? 0 : start + 1;
  const mostrandoHasta = Math.min(end, turnosFiltrados.length);

  const rol = String(usuario?.rol || 'cliente');
  const esAdmin = rol === 'admin' || rol === 'superadmin';
  const esCliente = !esAdmin;
  const nombre = usuario?.nombre || (rol === 'superadmin' ? 'Triny' : '(Sin nombre)');

  const createdAt = parseDateSafe(usuario?.createdAt);
  const updatedAt = parseDateSafe(usuario?.updatedAt);

  return (
    <>
      <div
        className="modal-usuario-overlay"
        onClick={cerrarOverlay}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,10,20,0.6)',
          backdropFilter: 'blur(6px)',
          zIndex: 2100,
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 'min(1050px, 96vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'rgba(255,255,255,0.92)',
          borderRadius: 20,
          padding: '18px 16px',
          boxShadow: '0 28px 70px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.45)',
          zIndex: 2101,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 14,
            fontSize: 28,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#d13fa0',
            fontWeight: 900,
          }}
          aria-label="Cerrar"
          title="Cerrar"
          type="button"
        >
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          {rol === 'admin' || rol === 'superadmin' ? (
            <Shield size={26} color="#d13fa0" />
          ) : (
            <UserIcon size={26} color="#38bdf8" />
          )}
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, color: '#d13fa0', fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>
              {nombre}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <span
                className="turnos-estado-badge"
                style={{
                  color: rol === 'superadmin' ? '#856404' : rol === 'admin' ? '#be185d' : '#0288d1',
                  border: `1px solid ${rol === 'superadmin' ? '#85640433' : rol === 'admin' ? '#be185d33' : '#0288d133'}`,
                }}
              >
                {rol === 'superadmin' ? 'SUPERADMIN' : rol === 'admin' ? 'ADMIN' : 'CLIENTE'}
              </span>
              {rol === 'superadmin' ? (
                <span
                  className="turnos-estado-badge"
                  style={{
                    color: '#856404',
                    border: '1px solid #85640433',
                    background: 'rgba(133,100,4,0.06)',
                  }}
                >
                  DUEÑA · TRINY
                </span>
              ) : (
                <span
                  className="turnos-estado-badge"
                  style={{
                    color: estadoCuenta?.color || '#1976d2',
                    border: `1px solid ${(estadoCuenta?.color || '#1976d2')}33`,
                  }}
                >
                  {estadoCuenta?.label || 'ACTIVO'}
                  {typeof estadoCuenta?.dias === 'number' ? ` · ${estadoCuenta.dias}d` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <div style={{ background: 'rgba(209,63,160,0.06)', border: '1px solid rgba(209,63,160,0.14)', borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7 }}>
              <div><b>Email:</b> {usuario?.email || '(Sin email)'}</div>
              <div><b>Teléfono:</b> {usuario?.telefono || '(Sin cargar)'}</div>
              <div><b>ID usuario:</b> <span style={{ fontFamily: 'monospace', color: '#666' }}>{getId(usuario) || '-'}</span></div>
            </div>
          </div>

          <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.20)', borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7 }}>
              <div><b>Registrado:</b> {createdAt ? format(createdAt, 'dd/MM/yyyy HH:mm') : '-'}</div>
              <div><b>Actualizado:</b> {updatedAt ? format(updatedAt, 'dd/MM/yyyy HH:mm') : '-'}</div>
              <div><b>Turnos:</b> {esCliente ? turnosOrdenados.length : '-'}</div>
            </div>
          </div>
        </div>

        {esCliente && (
          <div
            style={{
              marginTop: 12,
              background: 'rgba(56,189,248,0.08)',
              border: '1px solid rgba(56,189,248,0.20)',
              borderRadius: 14,
              padding: 12,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 13, color: '#333', fontWeight: 900 }}>
              Total abonado (neto):{' '}
              <span style={{ color: '#388e3c' }}>
                ${Number(resumenPagos.totalAbonadoNeto || 0).toLocaleString()}
              </span>
            </div>

            <div style={{ fontSize: 12, color: '#555', fontWeight: 800 }}>
              Pagos sumados: {resumenPagos.pagosSumados}
            </div>
          </div>
        )}

        {esCliente && (
          <div
            style={{
              marginTop: 10,
              background: 'rgba(209,63,160,0.06)',
              border: '1px solid rgba(209,63,160,0.14)',
              borderRadius: 14,
              padding: 12,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              className="turnos-estado-badge"
              onClick={() => setFiltroHistorial('todos')}
              style={{
                cursor: 'pointer',
                background: filtroHistorial === 'todos' ? 'rgba(74,29,59,0.10)' : '#fff',
                color: '#4a1d3b',
                border: '1px solid rgba(74,29,59,0.22)',
              }}
              aria-pressed={filtroHistorial === 'todos'}
              aria-label="Mostrar todos los turnos"
              title="Limpiar filtro"
            >
              TODOS: {turnosOrdenados.length}
            </button>

            <button
              type="button"
              className="turnos-estado-badge"
              onClick={() => setFiltroHistorial((f) => (f === 'completado' ? 'todos' : 'completado'))}
              style={{
                cursor: 'pointer',
                background: filtroHistorial === 'completado' ? 'rgba(56,142,60,0.10)' : '#fff',
                color: '#388e3c',
                border: '1px solid #388e3c33',
              }}
              aria-pressed={filtroHistorial === 'completado'}
              aria-label="Filtrar historial por completados"
              title="Ver solo completados"
            >
              COMPLETADOS: {resumenEstados.completado}
            </button>

            <button
              type="button"
              className="turnos-estado-badge"
              onClick={() => setFiltroHistorial((f) => (f === 'confirmado' ? 'todos' : 'confirmado'))}
              style={{
                cursor: 'pointer',
                background: filtroHistorial === 'confirmado' ? 'rgba(25,118,210,0.10)' : '#fff',
                color: '#1976d2',
                border: '1px solid #1976d233',
              }}
              aria-pressed={filtroHistorial === 'confirmado'}
              aria-label="Filtrar historial por confirmados"
              title="Ver solo confirmados"
            >
              CONFIRMADOS: {resumenEstados.confirmado}
            </button>

            <button
              type="button"
              className="turnos-estado-badge"
              onClick={() => setFiltroHistorial((f) => (f === 'cancelado' ? 'todos' : 'cancelado'))}
              style={{
                cursor: 'pointer',
                background: filtroHistorial === 'cancelado' ? 'rgba(229,57,53,0.10)' : '#fff',
                color: '#e53935',
                border: '1px solid #e5393533',
              }}
              aria-pressed={filtroHistorial === 'cancelado'}
              aria-label="Filtrar historial por cancelados"
              title="Ver solo cancelados"
            >
              CANCELADOS: {resumenEstados.cancelado}
            </button>

            <button
              type="button"
              className="turnos-estado-badge"
              onClick={() => setFiltroHistorial((f) => (f === 'expirado' ? 'todos' : 'expirado'))}
              style={{
                cursor: 'pointer',
                background: filtroHistorial === 'expirado' ? 'rgba(255,152,0,0.12)' : '#fff',
                color: '#ff9800',
                border: '1px solid #ff980033',
              }}
              aria-pressed={filtroHistorial === 'expirado'}
              aria-label="Filtrar historial por expirados"
              title="Ver solo expirados"
            >
              EXPIRADOS: {resumenEstados.expirado}
            </button>

            <button
              type="button"
              className="turnos-estado-badge"
              onClick={() => setFiltroHistorial((f) => (f === 'rechazado' ? 'todos' : 'rechazado'))}
              style={{
                cursor: 'pointer',
                background: filtroHistorial === 'rechazado' ? 'rgba(160,32,240,0.10)' : '#fff',
                color: '#a020f0',
                border: '1px solid #a020f033',
              }}
              aria-pressed={filtroHistorial === 'rechazado'}
              aria-label="Filtrar historial por rechazados"
              title="Ver solo rechazados"
            >
              RECHAZADOS: {resumenEstados.rechazado}
            </button>
          </div>
        )}

        {esCliente && (
          <div style={{ marginTop: 14 }}>
            <div className="turnos-list-header" style={{ marginBottom: 8 }}>
              <div className="turnos-summary">Historial de turnos · Mostrando {mostrandoDesde}-{mostrandoHasta} de {turnosFiltrados.length}</div>
              {turnosFiltrados.length > itemsPorPagina && (
                <div className="turnos-pager turnos-pager-slim" aria-label="Paginación historial del usuario">
                  <button
                    type="button"
                    className="turnos-page-btn"
                    onClick={() => setPaginaTurnos((p) => Math.max(1, p - 1))}
                    disabled={paginaTurnos === 1}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="turnos-page-indicator">{paginaTurnos}/{totalPaginas}</span>
                  <button
                    type="button"
                    className="turnos-page-btn"
                    onClick={() => setPaginaTurnos((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaTurnos === totalPaginas}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="historial-table-frame historial-table-frame-usuario" style={{ padding: 10 }}>
              <div className="turnos-table historial-table historial-table-usuario" role="table" aria-label="Historial del usuario">
                <div className="turnos-row turnos-row-header" role="row">
                  <div className="turnos-cell cell-servicio" role="columnheader">
                    <span className="turnos-num turnos-num-header">N°</span>
                    <span>Servicio</span>
                  </div>
                  <div className="turnos-cell cell-fechaHora" role="columnheader">Fecha y hora</div>
                  <div className="turnos-cell cell-estado" role="columnheader">Estado</div>
                  <div className="turnos-cell cell-cliente" role="columnheader">Pago</div>
                  <div className="turnos-cell cell-opciones" role="columnheader">ID pago</div>
                </div>

                {turnosPaginados.length === 0 ? (
                  <div className="turnos-row" role="row">
                    <div className="turnos-cell" role="cell" style={{ gridColumn: '1 / -1', color: 'var(--text-light)', fontWeight: 800 }}>
                      {turnosOrdenados.length === 0
                        ? 'Este usuario todavía no tiene turnos registrados.'
                        : 'No hay turnos para este estado.'}
                    </div>
                  </div>
                ) : (
                  turnosPaginados.map((turno, idx) => {
                    const servicio = serviciosMap?.[turno.servicioId];
                    const rowNum = turnosFiltrados.length - (start + idx);
                    const dt = buildTurnoDateTimeSafe(turno);
                    const created = parseDateSafe(turno?.createdAt);
                    const uiEstado = getTurnoEstadoUI(turno);
                    const fechaLabel = dt ? `${format(new Date(String(turno.fecha).slice(0, 10) + 'T00:00:00'), 'dd/MM/yyyy')} · ${turno.hora || '--:--'} hs` : '-';

                    const pagoId = getTurnoPagoId(turno);
                    const turnoId = getId(turno);
                    const displayPagoId = pagoId || turnoId;

                  const total = typeof turno?.montoTotal === 'number' ? turno.montoTotal : null;
                  const pagadoDb = typeof turno?.montoPagado === 'number' ? turno.montoPagado : null;
                  const registroEstadistica = String(turno?.registroEstadistica || '').toLowerCase();
                  const seniaDevuelta = Boolean(turno?.seniaDevuelta);
                  const esPagoCompleto =
                    !seniaDevuelta &&
                    uiEstado.estadoKey === 'completado' &&
                    registroEstadistica !== 'seña' &&
                    typeof total === 'number' &&
                    total > 0;

                  const pagadoEfectivo = seniaDevuelta
                    ? 0
                    : esPagoCompleto
                      ? total
                      : (typeof pagadoDb === 'number' ? pagadoDb : null);

                  return (
                    <div key={getId(turno) || `${idx}`} className="turnos-row" role="row">
                      <div className="turnos-cell cell-servicio" role="cell">
                        <span className="turnos-num">{rowNum}</span>
                        <span className="turnos-servicio-nombre">{servicio?.nombre || 'Servicio'}</span>
                      </div>

                      <div className="turnos-cell cell-fechaHora" role="cell">
                        {fechaLabel}
                        {created ? (
                          <span
                            className="turnos-tooltip-wrap"
                            data-tooltip={`Creado: ${format(created, 'dd/MM/yyyy HH:mm')}`}
                            style={{ color: 'var(--text-light)' }}
                          >
                            <span className="turnos-id">Creado: {format(created, 'dd/MM/yyyy HH:mm')}</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="turnos-cell cell-estado" role="cell">
                        <span
                          className="turnos-estado-badge"
                          style={{
                            color: uiEstado.estadoColor,
                            border: `1px solid ${uiEstado.estadoColor}33`,
                          }}
                        >
                          {uiEstado.estadoLabel}
                        </span>
                        {uiEstado.infoDinero ? (
                          <span
                            className="turnos-tooltip-wrap"
                            data-tooltip={uiEstado.infoDinero}
                            style={{ color: '#a020f0' }}
                          >
                            <span className="turnos-id" style={{ color: 'inherit' }}>
                              {uiEstado.infoDinero}
                            </span>
                          </span>
                        ) : null}
                      </div>

                      <div className="turnos-cell cell-cliente" role="cell">
                        <span style={{ fontWeight: 900, color: '#388e3c' }}>
                          {total != null ? `$${Number(total).toLocaleString()}` : '-'}
                        </span>
                        <span className="turnos-id" style={{ color: '#1976d2' }}>
                          {pagadoEfectivo != null
                            ? `Pagado: $${Number(pagadoEfectivo).toLocaleString()}`
                            : ''}
                        </span>
                      </div>

                      <div className="turnos-cell cell-opciones" role="cell">
                        {displayPagoId ? (
                          <span
                            className="turnos-tooltip-wrap"
                            data-tooltip={displayPagoId}
                            style={{ color: 'var(--text-light)' }}
                          >
                            <span className="turnos-id">{displayPagoId}</span>
                          </span>
                        ) : (
                          <span className="turnos-id">-</span>
                        )}
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ConfirmModal({ title, message, confirmLabel = 'Confirmar', onConfirm, onClose, danger = false }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <>
      <div
        onClick={(e) => {
          if (e.target.classList.contains('confirm-overlay')) onClose?.();
        }}
        className="confirm-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,10,20,0.55)',
          backdropFilter: 'blur(5px)',
          zIndex: 2200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
        }}
      >
        <div
          style={{
            width: 'min(520px, 95vw)',
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(255,255,255,0.55)',
            borderRadius: 16,
            boxShadow: '0 28px 70px rgba(0,0,0,0.35)',
            padding: '16px 14px',
            position: 'relative',
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 8,
              right: 12,
              fontSize: 26,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#d13fa0',
              fontWeight: 900,
              lineHeight: 1,
            }}
            aria-label="Cerrar"
            title="Cerrar"
            type="button"
          >
            ×
          </button>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#4a1d3b' }}>{title}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#444', lineHeight: 1.4 }}>{message}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(74,29,59,0.18)',
                background: '#fff',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onConfirm}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: danger ? '1px solid rgba(229,57,53,0.35)' : '1px solid rgba(209,63,160,0.25)',
                background: danger ? 'rgba(229,57,53,0.10)' : 'rgba(209,63,160,0.10)',
                color: danger ? '#e53935' : '#d13fa0',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const UsuariosAdmin = () => {
  const { user: authUser } = useAuth();
  const esSuperadmin = authUser?.rol === 'superadmin';

  const [usuarios, setUsuarios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [turnosScope, setTurnosScope] = useState('recent');
  const [turnosPorUsuarioId, setTurnosPorUsuarioId] = useState({});
  const [serviciosMap, setServiciosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroUsuarios, setFiltroUsuarios] = useState('ultimos_5');
  const [pagina, setPagina] = useState(1);
  const [usuarioDetalle, setUsuarioDetalle] = useState(null);
  const [adminFormOpen, setAdminFormOpen] = useState(false);
  const [adminEditing, setAdminEditing] = useState(null);
  const [adminForm, setAdminForm] = useState({ nombre: '', email: '', telefono: '', password: '' });
  const [confirmSuspension, setConfirmSuspension] = useState(null);
  const [confirmOculto, setConfirmOculto] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    // Si el usuario sale de "ULTIMOS 5", necesitamos datos completos para filtros/estado cuenta.
    if (filtroUsuarios !== 'ultimos_5' && turnosScope !== 'all') {
      (async () => {
        try {
          const tRes = await turnosAPI.getAll();
          const turnosData = Array.isArray(tRes?.data) ? tRes.data : [];
          setTurnos(turnosData);
          setTurnosScope('all');
        } catch (error) {
          console.error('Error al cargar turnos completos:', error);
        }
      })();
    }
  }, [filtroUsuarios, turnosScope]);

  useEffect(() => {
    // Lazy load: cuando se abre el detalle, traer historial completo del usuario.
    const id = getId(usuarioDetalle);
    if (!id) return;
    if (turnosPorUsuarioId[id]) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await turnosAPI.getByUsuario(id);
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        setTurnosPorUsuarioId((prev) => ({ ...prev, [id]: arr }));
      } catch (error) {
        if (cancelled) return;
        console.error('Error al cargar turnos del usuario:', error);
        setTurnosPorUsuarioId((prev) => ({ ...prev, [id]: [] }));
      } finally {
        // no-op
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [usuarioDetalle, turnosPorUsuarioId]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroUsuarios]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [uRes, tRes, sRes] = await Promise.all([
        usuariosAPI.getAll(),
        turnosAPI.getAll({ limit: 200 }),
        serviciosAPI.getAll(),
      ]);

      const usuariosData = Array.isArray(uRes?.data) ? uRes.data : [];
      usuariosData.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      setUsuarios(usuariosData);

      const turnosData = Array.isArray(tRes?.data) ? tRes.data : [];
      setTurnos(turnosData);
      setTurnosScope('recent');

      const sMap = {};
      const serviciosData = Array.isArray(sRes?.data) ? sRes.data : [];
      serviciosData.forEach((s) => {
        sMap[s.id] = s;
      });
      setServiciosMap(sMap);
    } catch (error) {
      console.error('Error al cargar datos de usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const ultimaActividadPorUsuarioId = useMemo(() => {
    const map = {};
    (Array.isArray(turnos) ? turnos : []).forEach((t) => {
      const usuarioId = String(t?.usuarioId || '').trim();
      if (!usuarioId) return;
      // Actividad = última vez que el cliente "sacó" un servicio (creación de turno)
      // No usar fecha/hora del turno porque puede ser a futuro y no representa actividad reciente.
      const dt = parseDateSafe(t?.createdAt) || buildTurnoDateTime(t);
      if (!dt) return;
      const prev = map[usuarioId];
      if (!prev || dt.getTime() > prev.getTime()) {
        map[usuarioId] = dt;
      }
    });
    return map;
  }, [turnos]);

  const getFechaUltimaActividad = (u) => {
    const id = getId(u);
    const lastTurno = ultimaActividadPorUsuarioId[id] || null;
    if (lastTurno) return lastTurno;
    return parseDateSafe(u?.updatedAt) || parseDateSafe(u?.createdAt) || null;
  };

  const getEstadoCuenta = (u) => {
    if (Boolean(u?.oculto)) {
      return { label: 'OCULTO', color: 'var(--text-light)', dias: null };
    }
    if (Boolean(u?.suspendido)) {
      return { label: 'SUSPENDIDO', color: '#e53935', dias: null };
    }
    const fechaUlt = getFechaUltimaActividad(u);
    if (!fechaUlt) {
      return { label: 'INACTIVO', color: '#ff9800', dias: null };
    }
    const dias = Math.max(0, differenceInDays(new Date(), fechaUlt));
    if (dias >= DIAS_INACTIVIDAD) {
      return { label: 'INACTIVO', color: '#ff9800', dias };
    }
    return { label: 'ACTIVO', color: '#388e3c', dias };
  };

  const matchesBusqueda = (u) => {
    const q = String(busqueda || '').toLowerCase().trim();
    if (!q) return true;
    const nombre = String(u?.nombre || '').toLowerCase();
    const email = String(u?.email || '').toLowerCase();
    const telefono = String(u?.telefono || '');
    return nombre.includes(q) || email.includes(q) || telefono.includes(q);
  };

  const usuariosFiltrados = useMemo(() => {
    const arr = Array.isArray(usuarios) ? [...usuarios] : [];
    const filtrados = arr.filter((u) => {
      const rol = String(u?.rol || 'cliente');
      const esOculto = Boolean(u?.oculto);
      const esAdmin = rol === 'admin' || rol === 'superadmin';
      const esAdminSolo = rol === 'admin';

      if (!matchesBusqueda(u)) return false;

      // Ocultos (soft hide)
      if (filtroUsuarios === 'ocultos') {
        if (!esOculto) return false;
      } else {
        if (esOculto) return false;
      }

      // Roles
      if (filtroUsuarios === 'ultimos_5') {
        if (esAdmin) return false;
      }

      if (filtroUsuarios === 'clientes' || filtroUsuarios === 'clientes_activos' || filtroUsuarios === 'clientes_inactivos') {
        if (esAdmin) return false;
      }

      if (filtroUsuarios === 'admins' || filtroUsuarios === 'admins_suspendidos') {
        if (!esAdmin) return false;
      }

      // Subfiltros
      if (filtroUsuarios === 'clientes_activos') return getEstadoCuenta(u)?.label === 'ACTIVO';
      if (filtroUsuarios === 'clientes_inactivos') return getEstadoCuenta(u)?.label === 'INACTIVO';
      if (filtroUsuarios === 'admins_suspendidos') return esAdminSolo && Boolean(u?.suspendido);

      if (filtroUsuarios === 'ultimos_5') return true;

      return true;
    });

    if (filtroUsuarios === 'ultimos_5') {
      filtrados.sort((a, b) => {
        const da = getFechaUltimaActividad(a) || new Date(0);
        const db = getFechaUltimaActividad(b) || new Date(0);
        return db.getTime() - da.getTime();
      });
      return filtrados.slice(0, 5);
    }

    const rolOrder = (r) => (r === 'superadmin' ? 0 : r === 'admin' ? 1 : 2);
    filtrados.sort((a, b) => {
      const ra = String(a?.rol || 'cliente');
      const rb = String(b?.rol || 'cliente');
      const oa = rolOrder(ra);
      const ob = rolOrder(rb);
      if (oa !== ob) return oa - ob;

      const na = String(a?.nombre || '').toLowerCase();
      const nb = String(b?.nombre || '').toLowerCase();
      if (na && nb && na !== nb) return na.localeCompare(nb);

      const da = parseDateSafe(a?.createdAt) || new Date(0);
      const db = parseDateSafe(b?.createdAt) || new Date(0);
      return db.getTime() - da.getTime();
    });

    return filtrados;
  }, [usuarios, filtroUsuarios, busqueda, ultimaActividadPorUsuarioId]);

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / ITEMS_POR_PAGINA));
  const usuariosPaginados = usuariosFiltrados.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  );

  const emptyLabel = useMemo(() => {
    if (filtroUsuarios === 'ocultos') return 'No hay usuarios ocultos.';
    if (filtroUsuarios === 'admins_suspendidos') return 'No hay admins suspendidos.';
    if (filtroUsuarios === 'admins') return 'No hay admins.';
    if (filtroUsuarios === 'clientes_activos') return 'No hay clientes activos.';
    if (filtroUsuarios === 'clientes_inactivos') return 'No hay clientes inactivos.';
    if (filtroUsuarios === 'clientes') return 'No hay clientes.';
    if (filtroUsuarios === 'todos') return 'No hay usuarios.';
    return 'No hay resultados.';
  }, [filtroUsuarios]);

  const start = (pagina - 1) * ITEMS_POR_PAGINA;
  const end = start + ITEMS_POR_PAGINA;
  const mostrandoDesde = usuariosFiltrados.length === 0 ? 0 : start + 1;
  const mostrandoHasta = Math.min(end, usuariosFiltrados.length);

  const abrirCrearAdmin = () => {
    setAdminEditing(null);
    setAdminForm({ nombre: '', email: '', telefono: '', password: '' });
    setAdminFormOpen(true);
  };

  const abrirEditarAdmin = (admin) => {
    setAdminEditing(admin);
    setAdminForm({
      nombre: admin?.nombre || '',
      email: admin?.email || '',
      telefono: admin?.telefono || '',
      password: '',
    });
    setAdminFormOpen(true);
  };

  const cerrarAdminForm = () => {
    setAdminFormOpen(false);
    setAdminEditing(null);
  };

  const guardarAdmin = async (e) => {
    e?.preventDefault?.();
    try {
      if (adminEditing) {
        const payload = {
          nombre: adminForm.nombre,
          telefono: adminForm.telefono,
        };
        if (adminForm.password) payload.password = adminForm.password;
        await usuariosAPI.update(getId(adminEditing), payload);
      } else {
        await usuariosAPI.create({
          nombre: adminForm.nombre,
          email: adminForm.email,
          telefono: adminForm.telefono,
          password: adminForm.password,
          rol: 'admin',
        });
      }
      cerrarAdminForm();
      await cargarDatos();
    } catch (error) {
      console.error('Error guardando admin:', error);
      alert(error?.response?.data?.mensaje || 'No se pudo guardar el admin');
    }
  };

  const abrirConfirmSuspenderAdmin = (admin) => {
    setConfirmSuspension({
      admin,
      nextSuspendido: !Boolean(admin?.suspendido),
    });
  };

  const confirmarSuspenderAdmin = async () => {
    const admin = confirmSuspension?.admin;
    const nextSuspendido = Boolean(confirmSuspension?.nextSuspendido);
    if (!admin) return;

    try {
      await usuariosAPI.update(getId(admin), { suspendido: nextSuspendido });
      setConfirmSuspension(null);
      await cargarDatos();
    } catch (error) {
      console.error('Error suspendiendo admin:', error);
      alert(error?.response?.data?.mensaje || error?.response?.data?.error || 'No se pudo actualizar el estado');
    }
  };

  const abrirConfirmOcultarUsuario = (usuario) => {
    if (!usuario) return;
    setConfirmOculto({
      usuario,
      nextOculto: !Boolean(usuario?.oculto),
    });
  };

  const confirmarOcultarUsuario = async () => {
    const usuario = confirmOculto?.usuario;
    const nextOculto = Boolean(confirmOculto?.nextOculto);
    if (!usuario) return;

    try {
      await usuariosAPI.update(getId(usuario), { oculto: nextOculto });
      setConfirmOculto(null);
      await cargarDatos();
    } catch (error) {
      console.error('Error ocultando usuario:', error);
      alert(error?.response?.data?.mensaje || error?.response?.data?.error || 'No se pudo actualizar el estado');
    }
  };

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
        <p>Usuarios en tabla con estado (activo/inactivo) + historial</p>
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

          <button
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
            onClick={abrirCrearAdmin}
          >
            <Plus size={18} /> Crear admin
          </button>

          <div className="filtros">
            <div className="filtros filtros-compact" aria-label="Filtro de usuarios">
              <span className="filtros-icon" aria-hidden="true">
                <Filter size={16} />
              </span>
              <select
                className="filtro-select"
                value={filtroUsuarios}
                onChange={(e) => setFiltroUsuarios(e.target.value)}
                aria-label="Filtrar usuarios"
                title="Filtrar usuarios"
              >
                {USUARIOS_FILTROS.map((f) => (
                  <option key={f} value={f}>
                    {formatEstadoLabel(f)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="historial-table-frame usuarios-table-frame">
          <div className="turnos-list-header">
            <div className="turnos-summary">
              Mostrando {mostrandoDesde}-{mostrandoHasta} de {usuariosFiltrados.length}
            </div>

            {usuariosFiltrados.length > ITEMS_POR_PAGINA && (
              <div className="turnos-pager" aria-label="Paginación usuarios">
                <button
                  type="button"
                  className="turnos-page-btn"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="turnos-page-indicator">{pagina}/{totalPaginas}</span>
                <button
                  type="button"
                  className="turnos-page-btn"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="turnos-table usuarios-table" role="table" aria-label="Listado de usuarios">
            <div className="turnos-row turnos-row-header" role="row">
              <div className="turnos-cell cell-usuario" role="columnheader">
                <span className="turnos-num turnos-num-header">N°</span>
                <span>Usuario</span>
              </div>
              <div className="turnos-cell cell-rol" role="columnheader">Rol</div>
              <div className="turnos-cell cell-ultimo" role="columnheader">Último turno</div>
              <div className="turnos-cell cell-estado" role="columnheader">Estado</div>
              <div className="turnos-cell cell-opciones" role="columnheader">Acciones</div>
            </div>

            {usuariosPaginados.length === 0 ? (
              <div className="turnos-row" role="row">
                <div className="turnos-cell" role="cell" style={{ gridColumn: '1 / -1', color: 'var(--text-light)', fontWeight: 800 }}>
                  {emptyLabel}
                </div>
              </div>
            ) : (
              usuariosPaginados.map((u, idx) => {
                const id = getId(u);
                const rol = String(u?.rol || 'cliente');
                const esSuper = rol === 'superadmin';
                const esAdmin = rol === 'admin' || esSuper;
                const nombre = u?.nombre || (esSuper ? 'Triny' : '(Sin nombre)');
                const fechaUlt = ultimaActividadPorUsuarioId[id] || null;
                const estadoCuenta = getEstadoCuenta(u);
                const rowNum = start + idx + 1;

                const puedeEditar = esSuperadmin && rol !== 'superadmin';
                const puedeSuspender = esSuperadmin && rol === 'admin';
                const puedeOcultar = esSuperadmin && rol !== 'superadmin';

                return (
                  <div key={id} className={`turnos-row ${esSuper ? 'is-superadmin' : ''}`} role="row">
                    <div className="turnos-cell cell-usuario" role="cell">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <span className="turnos-num">{rowNum}</span>
                        {esAdmin ? <Shield size={18} color="#d13fa0" /> : <UserIcon size={18} color="#38bdf8" />}
                        <div style={{ minWidth: 0 }}>
                          <span className="usuarios-nombre">{nombre}</span>
                          <span className="usuarios-sub reveal-hover">{id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="turnos-cell cell-rol" role="cell">
                      <span
                        className="turnos-estado-badge"
                        style={{
                          color: esSuper ? '#856404' : esAdmin ? '#be185d' : '#0288d1',
                          border: `1px solid ${esSuper ? '#85640433' : esAdmin ? '#be185d33' : '#0288d133'}`,
                        }}
                      >
                        {esSuper ? '👑 SUPERADMIN' : esAdmin ? 'ADMIN' : 'CLIENTE'}
                      </span>
                    </div>

                    <div className="turnos-cell cell-ultimo" role="cell">
                      {fechaUlt ? format(fechaUlt, 'dd/MM/yyyy') : '-'}
                      {fechaUlt ? <span className="usuarios-sub">{format(fechaUlt, 'HH:mm')}</span> : null}
                    </div>

                    <div className="turnos-cell cell-estado" role="cell">
                      {esSuper ? (
                        <span
                          className="turnos-estado-badge"
                          style={{
                            color: '#856404',
                            border: '1px solid #85640433',
                            background: 'rgba(133,100,4,0.06)',
                          }}
                        >
                          DUEÑA · TRINY
                        </span>
                      ) : (
                        <span
                          className="turnos-estado-badge"
                          style={{
                            color: estadoCuenta.color,
                            border: `1px solid ${estadoCuenta.color}33`,
                          }}
                        >
                          {estadoCuenta.label}
                          {typeof estadoCuenta.dias === 'number' ? ` · ${estadoCuenta.dias}d` : ''}
                        </span>
                      )}
                    </div>

                    <div className="turnos-cell cell-opciones" role="cell">
                      <div className="usuarios-actions">
                        <button
                          className="turnos-editar-btn"
                          title="Ver detalles"
                          aria-label="Ver detalles"
                          type="button"
                          onClick={() => setUsuarioDetalle(u)}
                        >
                          <Eye size={18} />
                        </button>

                        {puedeOcultar && (
                          <button
                            className={`turnos-editar-btn ${u?.oculto ? '' : 'is-delete'}`}
                            title={u?.oculto ? 'Mostrar usuario' : 'Ocultar usuario'}
                            aria-label={u?.oculto ? 'Mostrar usuario' : 'Ocultar usuario'}
                            type="button"
                            onClick={() => abrirConfirmOcultarUsuario(u)}
                          >
                            {u?.oculto ? <RotateCcw size={18} /> : <EyeOff size={18} />}
                          </button>
                        )}

                        {puedeSuspender && (
                          <button
                            className={`turnos-editar-btn ${u?.suspendido ? 'is-delete' : ''}`}
                            title={u?.suspendido ? 'Reactivar admin' : 'Suspender admin'}
                            aria-label={u?.suspendido ? 'Reactivar admin' : 'Suspender admin'}
                            type="button"
                            onClick={() => abrirConfirmSuspenderAdmin(u)}
                          >
                            {u?.suspendido ? <CheckCircle2 size={18} /> : <Ban size={18} />}
                          </button>
                        )}

                        {puedeEditar && (
                          <button
                            className="turnos-editar-btn"
                            title={rol === 'admin' ? 'Editar admin' : 'Editar cliente'}
                            aria-label={rol === 'admin' ? 'Editar admin' : 'Editar cliente'}
                            type="button"
                            onClick={() => abrirEditarAdmin(u)}
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal crear/editar admin */}
        {adminFormOpen && (
          <div className="modal-usuario-detalle" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
            <div style={{background:'#fff',padding:'18px 16px',borderRadius:'14px',minWidth:'260px',maxWidth:'95vw',boxShadow:'0 4px 32px #0002',position:'relative',display:'flex',flexDirection:'column',gap:'10px'}}>
              <button onClick={cerrarAdminForm} style={{position:'absolute',top:8,right:12,background:'none',border:'none',cursor:'pointer',color:'#d13fa0'}} title="Cerrar">
                <X size={22} />
              </button>
              <h2 style={{margin:'0 0 6px 0',fontSize:'1.05rem',fontWeight:700,color:'#d13fa0'}}>
                {adminEditing
                  ? (String(adminEditing?.rol || 'cliente') === 'admin' ? 'Editar admin' : 'Editar cliente')
                  : 'Crear admin'}
              </h2>
              <form onSubmit={guardarAdmin} style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <label style={{fontWeight:600,fontSize:'0.95rem'}}>
                  Nombre
                  <input
                    value={adminForm.nombre}
                    onChange={(e)=>setAdminForm(f=>({ ...f, nombre: e.target.value }))}
                    required
                    style={{width:'100%',marginTop:6,padding:8,borderRadius:8,border:'1.5px solid #f9a8d4'}}
                  />
                </label>
                <label style={{fontWeight:600,fontSize:'0.95rem'}}>
                  Email
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e)=>setAdminForm(f=>({ ...f, email: e.target.value }))}
                    required
                    disabled={Boolean(adminEditing)}
                    style={{width:'100%',marginTop:6,padding:8,borderRadius:8,border:'1.5px solid #f9a8d4'}}
                  />
                </label>
                <label style={{fontWeight:600,fontSize:'0.95rem'}}>
                  Teléfono
                  <input
                    value={adminForm.telefono}
                    onChange={(e)=>setAdminForm(f=>({ ...f, telefono: e.target.value }))}
                    required
                    style={{width:'100%',marginTop:6,padding:8,borderRadius:8,border:'1.5px solid #f9a8d4'}}
                  />
                </label>
                <label style={{fontWeight:600,fontSize:'0.95rem'}}>
                  Contraseña {adminEditing ? '(dejar vacío para no cambiar)' : ''}
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e)=>setAdminForm(f=>({ ...f, password: e.target.value }))}
                    required={!adminEditing}
                    minLength={6}
                    style={{width:'100%',marginTop:6,padding:8,borderRadius:8,border:'1.5px solid #f9a8d4'}}
                  />
                </label>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:6}}
                >
                  {adminEditing ? <Pencil size={18} /> : <Plus size={18} />} {adminEditing ? 'Guardar cambios' : 'Crear admin'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal de detalles + historial */}
        {usuarioDetalle && (() => {
          const id = getId(usuarioDetalle);
          const turnosUsuario = turnosPorUsuarioId[id] || [];
          const estadoCuenta = getEstadoCuenta(usuarioDetalle);
          return (
            <ModalUsuarioDetalle
              usuario={usuarioDetalle}
              turnosUsuario={turnosUsuario}
              serviciosMap={serviciosMap}
              estadoCuenta={estadoCuenta}
              onClose={() => setUsuarioDetalle(null)}
            />
          );
        })()}

        {confirmSuspension?.admin && (
          <ConfirmModal
            title={confirmSuspension?.nextSuspendido ? 'Suspender admin' : 'Reactivar admin'}
            message={
              confirmSuspension?.nextSuspendido
                ? `¿Querés suspender a ${confirmSuspension?.admin?.nombre || 'este admin'}? No podrá iniciar sesión ni usar el panel.`
                : `¿Querés reactivar a ${confirmSuspension?.admin?.nombre || 'este admin'}? Podrá volver a iniciar sesión.`
            }
            confirmLabel={confirmSuspension?.nextSuspendido ? 'Suspender' : 'Reactivar'}
            danger={Boolean(confirmSuspension?.nextSuspendido)}
            onConfirm={confirmarSuspenderAdmin}
            onClose={() => setConfirmSuspension(null)}
          />
        )}

        {confirmOculto?.usuario && (
          <ConfirmModal
            title={confirmOculto?.nextOculto ? 'Ocultar usuario' : 'Mostrar usuario'}
            message={
              confirmOculto?.nextOculto
                ? `¿Querés ocultar a ${confirmOculto?.usuario?.nombre || 'este usuario'}? No se va a borrar, solo quedará en “Ocultos”.`
                : `¿Querés mostrar a ${confirmOculto?.usuario?.nombre || 'este usuario'}? Volverá a aparecer en la lista normal.`
            }
            confirmLabel={confirmOculto?.nextOculto ? 'Ocultar' : 'Mostrar'}
            danger={Boolean(confirmOculto?.nextOculto)}
            onConfirm={confirmarOcultarUsuario}
            onClose={() => setConfirmOculto(null)}
          />
        )}
      </div>
    </div>
  );
};

export default UsuariosAdmin;
