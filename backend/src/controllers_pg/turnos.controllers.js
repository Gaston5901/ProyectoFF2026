import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { pgQuery } from '../database/postgres.js';
import { enviarComprobanteTurno, enviarTurnoReprogramado } from '../helpers/emailSender.cjs';

// Normaliza horas para que siempre queden con formato HH:MM.
function normalizeHora(value) {
  let hora = String(value || '').trim();
  if (/^\d{1,2}:\d{1,2}$/.test(hora)) {
    const [hh, mm] = hora.split(':');
    hora = hh.padStart(2, '0') + ':' + mm.padStart(2, '0');
  }
  return hora;
}

// Convierte una fecha a formato YYYY-MM-DD para usarla en emails.
function formatFechaEmail(value) {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return '';
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

// Convierte una fila cruda de PostgreSQL al formato esperado por la API.
function mapTurnoRow(row) {
  if (!row) return row;

  const fecha = row.fecha instanceof Date ? row.fecha.toISOString().slice(0, 10) : String(row.fecha);

  const horaRaw = typeof row.hora === 'string' ? row.hora : row.hora?.toString?.() || '';
  const hora = horaRaw ? normalizeHora(horaRaw.slice(0, 5)) : '';

  return {
    id: String(row.id),
    mongo_id: row.mongo_id || undefined,

    usuarioId: String(row.usuario_id),
    servicioId: String(row.servicio_id),

    // Para mostrar históricos aunque el servicio esté archivado.
    // (El endpoint /servicios filtra por activo=true, pero turnos necesita el nombre.)
    servicioNombre: row.servicio_nombre || row.servicioNombre || '',

    fecha,
    hora,
    estado: row.estado,

    email: row.email || '',
    nombre: row.nombre || '',
    username: row.usuario_username || row.username || '',
    usuarioNombre: row.usuario_nombre || '',
    telefono: row.telefono || '',

    comentario: row.comentario || '',
    registroEstadistica: row.registro_estadistica || '',

    montoPagado: Number(row.monto_pagado || 0),
    montoTotal: Number(row.monto_total || 0),

    emailEnviado: Boolean(row.email_enviado),
    seniaDevuelta: Boolean(row.senia_devuelta),

    comprobanteTransferencia: row.comprobante_path || '',
    estadoTransferencia: row.estado_transferencia || '',
    motivoRechazoTransferencia: row.motivo_rechazo_transferencia || '',
    titularTransferencia: row.titular_transferencia || '',
    metodoTransferencia: row.metodo_transferencia || '',

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Lee el mapa de horarios configurado por día o por fecha especial.
async function getConfigHorariosPorDia() {
  const { rows } = await pgQuery('SELECT horarios_por_dia FROM configuracion WHERE id = 1 LIMIT 1');
  return rows?.[0]?.horarios_por_dia || {};
}

// Lee el porcentaje de seña configurado, con fallback a 50%.
async function getPorcentajeSenia() {
  const { rows } = await pgQuery('SELECT porcentaje_senia FROM configuracion WHERE id = 1 LIMIT 1');
  const raw = rows?.[0]?.porcentaje_senia;
  const val = raw == null ? 50 : Number(raw);
  if (!Number.isFinite(val)) return 50;
  return Math.min(100, Math.max(0, val));
}

// Redondea valores monetarios a 2 decimales.
function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

// Calcula la seña a partir del total y el porcentaje configurado.
function computeSenia(montoTotal, porcentajeSenia) {
  const total = Number(montoTotal);
  if (!Number.isFinite(total) || total <= 0) return 0;
  const pct = Number(porcentajeSenia);
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return round2(total * (pct / 100));
}

// Devuelve los horarios válidos uniendo horarios base y excepciones de fecha.
function computeHorariosValidos(horariosPorDia, fecha) {
  const day = new Date(fecha + 'T00:00:00').getDay();
  const normales = Array.isArray(horariosPorDia[String(day)]) ? horariosPorDia[String(day)] : [];
  const extrasFecha = Array.isArray(horariosPorDia[fecha]) ? horariosPorDia[fecha] : [];
  const limpiarHora = (h) => normalizeHora(h);
  return Array.from(new Set([...normales, ...extrasFecha].map(limpiarHora)));
}

// Busca los datos del servicio para incluirlos en emails y cálculos.
async function getServicioForEmail(servicioId) {
  const { rows } = await pgQuery('SELECT nombre, precio FROM servicios WHERE id = $1 LIMIT 1', [servicioId]);
  return rows[0] || null;
}

// Indica si la request pidió enviar email o no.
function shouldSendEmail(req) {
  const v = req?.body?.enviarEmail;
  return v !== false && v !== 'false';
}

// Intenta resolver un nombre amigable para usar en el email.
async function resolveNombreParaEmailFromTurnoRow(turnoRow) {
  const nombreTurno = String(turnoRow?.nombre || '').trim();
  if (nombreTurno) return nombreTurno;

  const usuarioId = turnoRow?.usuario_id;
  if (usuarioId != null) {
    try {
      const { rows } = await pgQuery('SELECT nombre, username, email FROM usuarios WHERE id = $1 LIMIT 1', [usuarioId]);
      const u = rows?.[0];
      const nombreUsuario = String(u?.nombre || '').trim();
      if (nombreUsuario) return nombreUsuario;
      const username = String(u?.username || '').trim();
      if (username) return username.split('@')[0] || username;
      const emailUsuario = String(u?.email || '').trim();
      if (emailUsuario) return emailUsuario.split('@')[0] || emailUsuario;
    } catch {
      // ignore
    }
  }

  const email = String(turnoRow?.email || '').trim();
  if (email) return email.split('@')[0] || email;
  return 'cliente';
}

// Envuelve una promesa con timeout para no bloquear envíos de email.
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`sendMail timeout ${ms}ms`)), ms)),
  ]);
}

// Busca un usuario por email o lo crea si no existe.
async function findOrCreateUsuarioByEmail({ emailNorm, nombre, telefono, passwordGenerada }) {
  const { rows: foundRows } = await pgQuery('SELECT id, email, nombre, telefono FROM usuarios WHERE email = $1 LIMIT 1', [
    emailNorm,
  ]);
  const found = foundRows[0];
  if (found) {
    return { usuarioId: found.id, usuarioCreadoAhora: false, passwordGenerada: null };
  }

  const passwordToUse = passwordGenerada || crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(String(passwordToUse), 10);

  const { rows } = await pgQuery(
    `INSERT INTO usuarios (nombre, email, username, telefono, password_hash, rol)
     VALUES ($1, $2, $3, $4, $5, 'cliente')
     RETURNING id`,
    [String(nombre || ''), emailNorm, emailNorm, String(telefono || ''), passwordHash]
  );

  return { usuarioId: rows[0].id, usuarioCreadoAhora: true, passwordGenerada: passwordToUse };
}

// Devuelve los turnos que están esperando revisión de transferencia.
export const obtenerTurnosEnProceso = async (_req, res) => {
  try {
    // Cruza turnos con usuario y servicio para mostrar nombres legibles.
    const { rows } = await pgQuery(
      `SELECT t.*, u.username AS usuario_username, u.nombre AS usuario_nombre
              , s.nombre AS servicio_nombre
       FROM turnos t
       LEFT JOIN usuarios u ON u.id = t.usuario_id
       LEFT JOIN servicios s ON s.id = t.servicio_id
       WHERE t.estado = 'en_proceso'
       ORDER BY t.fecha ASC, t.hora ASC`
    );
    return res.json(rows.map(mapTurnoRow));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

// Aprueba una transferencia, confirma el turno y luego envía el comprobante.
export const aprobarTransferencia = async (req, res) => {
  try {
    // Marca la transferencia como aprobada y asegura el estado confirmado.
    const { rows } = await pgQuery(
      `UPDATE turnos
       SET estado_transferencia = 'aprobado',
           motivo_rechazo_transferencia = '',
           estado = 'confirmado',
           monto_pagado = CASE
             WHEN COALESCE(monto_pagado, 0) <= 0 THEN round(((monto_total * (SELECT COALESCE(porcentaje_senia, 50) FROM configuracion WHERE id = 1) / 100.0))::numeric, 2)
             ELSE monto_pagado
           END,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ mensaje: 'Turno no encontrado' });

    const turnoRow = rows[0];
    const payload = mapTurnoRow(turnoRow);
    res.json({ mensaje: 'Transferencia aprobada', turno: payload });

    // Enviar mail SOLO cuando se aprueba la transferencia
    if (!shouldSendEmail(req)) return;

    setImmediate(async () => {
      try {
        const servicioRow = await getServicioForEmail(turnoRow.servicio_id);
        const nombreEmail = await resolveNombreParaEmailFromTurnoRow(turnoRow);
        const serviciosArr = [
          {
            title: servicioRow?.nombre || '',
            unit_price: Number(servicioRow?.precio || 0),
          },
        ];

        const total = Number(turnoRow.monto_total || 0) || Number(servicioRow?.precio || 0) || 0;
        const senia = Number(turnoRow.monto_pagado || 0) || 0;

        await withTimeout(
          enviarComprobanteTurno({
            to: String(turnoRow.email || '').trim(),
            nombre: nombreEmail,
            servicios: serviciosArr,
            seña: senia,
            total,
            pagoId: String(turnoRow.pago_id || turnoRow.id),
            fecha: formatFechaEmail(turnoRow.fecha),
            hora: String(turnoRow.hora || ''),
            restoAPagar: total - senia,
            extras: '',
          }),
          60000
        );

        await pgQuery('UPDATE turnos SET email_enviado = true, updated_at = now() WHERE id = $1', [turnoRow.id]);
      } catch (mailError) {
        console.error('Error enviando comprobante de turno (PG, aprobarTransferencia):', mailError?.message || mailError);
      }
    });

    return;
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
};

// Rechaza una transferencia y guarda el motivo.
export const rechazarTransferencia = async (req, res) => {
  try {
    // Cambia el estado y conserva el motivo escrito por admin.
    const motivo = (req.body && req.body.motivo) ? String(req.body.motivo) : '';
    const { rows } = await pgQuery(
      `UPDATE turnos
       SET estado_transferencia = 'rechazado',
           motivo_rechazo_transferencia = $2,
           estado = CASE WHEN estado = 'en_proceso' THEN 'rechazado' ELSE estado END,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, motivo]
    );

    if (!rows[0]) return res.status(404).json({ mensaje: 'Turno no encontrado' });
    return res.json({ mensaje: 'Transferencia rechazada', turno: mapTurnoRow(rows[0]) });
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
};

// Crea un turno con comprobante de transferencia adjunto.
export const crearTurnoTransferencia = async (req, res) => {
  try {
    // Obtiene datos del formulario y valida el archivo subido.
    const { email, nombre, telefono, servicio, fecha, hora, comentario, montoTotal } = req.body;
    const comprobanteFile = req.file;

    if (req.fileValidationError) {
      return res.status(400).json({ mensaje: req.fileValidationError });
    }
    if (!comprobanteFile) {
      return res.status(400).json({ mensaje: 'Debe adjuntar un comprobante de transferencia.' });
    }

    const emailNorm = String(email || '').toLowerCase().trim();
    const servicioId = servicio;
    const fechaStr = String(fecha || '').slice(0, 10);
    const horaSolicitada = normalizeHora(hora);

    const horariosPorDia = await getConfigHorariosPorDia();
    const horariosValidos = computeHorariosValidos(horariosPorDia, fechaStr);
    if (!horariosValidos.includes(horaSolicitada)) {
      return res.status(409).json({ mensaje: `El horario ${horaSolicitada} no está disponible para ese día.` });
    }

    const { usuarioId } = await findOrCreateUsuarioByEmail({
      emailNorm,
      nombre,
      telefono,
      passwordGenerada: req.body.passwordGenerada,
    });

    // Si ya existe el mismo turno para ese usuario+servicio+fecha+hora, devolverlo
    const { rows: existing } = await pgQuery(
      `SELECT *
       FROM turnos
       WHERE usuario_id = $1
         AND servicio_id = $2
         AND fecha = $3
         AND hora = $4
         AND estado IN ('pendiente','confirmado','en_proceso')
       LIMIT 1`,
      [usuarioId, servicioId, fechaStr, horaSolicitada]
    );
    if (existing[0]) {
      return res.status(200).json(mapTurnoRow(existing[0]));
    }

    let total = Number(montoTotal || 0);
    if (!Number.isFinite(total) || total <= 0) {
      const servicioRow = await getServicioForEmail(servicioId);
      total = Number(servicioRow?.precio || 0);
    }
    const porcentajeSenia = await getPorcentajeSenia();
    const senia = computeSenia(total, porcentajeSenia);

    const { rows } = await pgQuery(
      `INSERT INTO turnos (
        usuario_id,
        servicio_id,
        fecha,
        hora,
        estado,
        email,
        nombre,
        telefono,
        comentario,
        monto_total,
        monto_pagado,
        comprobante_path,
        estado_transferencia,
        titular_transferencia,
        metodo_transferencia
      ) VALUES (
        $1,$2,$3,$4,
        'en_proceso',
        $5,$6,$7,
        $8,$9,$10,
        $11,
        'pendiente',
        $12,$13
      )
      RETURNING *`,
      [
        usuarioId,
        servicioId,
        fechaStr,
        horaSolicitada,
        emailNorm,
        String(nombre || ''),
        String(telefono || ''),
        String(comentario || ''),
        total,
        senia,
        comprobanteFile.filename,
        String(req.body.titularTransferencia || ''),
        String(req.body.metodoTransferencia || ''),
      ]
    );

    const turnoRow = rows[0];

    let turnoRowFinal = turnoRow;
    if (!turnoRowFinal.pago_id) {
      const prettyPagoId = `TRANSFERENCIA-${String(turnoRowFinal.id).padStart(3, '0')}`;
      try {
        const { rows: updatedRows } = await pgQuery(
          'UPDATE turnos SET pago_id = $1, updated_at = now() WHERE id = $2 RETURNING *',
          [prettyPagoId, turnoRowFinal.id]
        );
        turnoRowFinal = updatedRows[0] || turnoRowFinal;
      } catch (e) {
        console.warn('[turnos][PG] No se pudo setear pago_id (transferencia):', e?.message || e);
      }
    }

    res.status(201).json(mapTurnoRow(turnoRowFinal));

    // Para transferencias, el comprobante se envía solo al aprobar por admin/superadmin.
    return;
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
};

// Marca la seña como devuelta y deja el turno en estado devuelto.
export const devolverSenia = async (req, res) => {
  try {
    // Actualiza solo las columnas vinculadas a la devolución.
    const { rows } = await pgQuery(
      `UPDATE turnos
       SET senia_devuelta = true,
           estado = 'devuelto',
           registro_estadistica = 'ninguno',
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ mensaje: 'Turno no encontrado' });
    return res.json(mapTurnoRow(rows[0]));
  } catch (error) {
    return res.status(400).json({ mensaje: error.message });
  }
};

// Crea un turno presencial o confirmado desde el panel/flujo principal.
export const crearTurno = async (req, res) => {
  try {
    // Lee lo mínimo necesario del request para crear la reserva.
    const { email, nombre, telefono, servicio, fecha } = req.body;

    const emailNorm = String(email || '').toLowerCase().trim();
    if (!emailNorm) return res.status(400).json({ mensaje: 'Email inválido' });

    const servicioId = servicio;
    const fechaStr = String(fecha || '').slice(0, 10);
    const horaSolicitada = normalizeHora(req.body.hora);

    const horariosPorDia = await getConfigHorariosPorDia();
    const horariosValidos = computeHorariosValidos(horariosPorDia, fechaStr);
    if (!horariosValidos.includes(horaSolicitada)) {
      return res.status(409).json({ mensaje: `El horario ${horaSolicitada} no está disponible para ese día.` });
    }

    const { usuarioId, usuarioCreadoAhora, passwordGenerada } = await findOrCreateUsuarioByEmail({
      emailNorm,
      nombre,
      telefono,
      passwordGenerada: req.body.passwordGenerada,
    });

    // Si ya existe el mismo turno para ese usuario+servicio+fecha+hora, devolverlo
    const { rows: existing } = await pgQuery(
      `SELECT *
       FROM turnos
       WHERE usuario_id = $1
         AND servicio_id = $2
         AND fecha = $3
         AND hora = $4
         AND estado IN ('pendiente','confirmado')
       LIMIT 1`,
      [usuarioId, servicioId, fechaStr, horaSolicitada]
    );
    if (existing[0]) {
      return res.status(200).json(mapTurnoRow(existing[0]));
    }

    let montoTotal = req.body.montoTotal != null ? Number(req.body.montoTotal) : 0;
    if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
      const servicioRow = await getServicioForEmail(servicioId);
      montoTotal = Number(servicioRow?.precio || 0);
    }
    const porcentajeSenia = await getPorcentajeSenia();
    const senia = computeSenia(montoTotal, porcentajeSenia);

    const rawPagoId = String(req.body.pagoId || '').trim();
    const rawPagoIdUpper = rawPagoId.toUpperCase();
    const metodoPago = String(req.body.metodoPago || '').toLowerCase().trim();
    const requestedEstado = String(req.body.estado || '').toLowerCase().trim();

    // Determinar estado final:
    // - Si es presencial confirmado: confirmado
    // - Si es Mercado Pago (confirmado): confirmado (frontend ya validó el pago)
    // - Si no: pendiente
    const isPresencial = rawPagoIdUpper.startsWith('PRESENCIAL') || metodoPago === 'presencial';
    const isMercadoPago = metodoPago === 'mercadopago' && requestedEstado === 'confirmado';
    const estadoToInsert = (isPresencial || isMercadoPago) && requestedEstado === 'confirmado' ? 'confirmado' : 'pendiente';

    const { rows } = await pgQuery(
      `INSERT INTO turnos (
        usuario_id,
        servicio_id,
        fecha,
        hora,
        estado,
        email,
        nombre,
        telefono,
        comentario,
        monto_total,
        monto_pagado
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        usuarioId,
        servicioId,
        fechaStr,
        horaSolicitada,
        estadoToInsert,
        emailNorm,
        String(nombre || ''),
        String(telefono || ''),
        String(req.body.comentario || ''),
        montoTotal,
        senia,
      ]
    );

    const turnoRow = rows[0];

    let turnoRowFinal = turnoRow;
    let pagoIdToStore = rawPagoId || null;

    if (pagoIdToStore && rawPagoIdUpper.startsWith('PRESENCIAL')) {
      pagoIdToStore = `PRESENCIAL-${String(turnoRowFinal.id).padStart(3, '0')}`;
    }

    if (pagoIdToStore) {
      try {
        const { rows: updatedRows } = await pgQuery(
          'UPDATE turnos SET pago_id = $1, updated_at = now() WHERE id = $2 RETURNING *',
          [pagoIdToStore, turnoRowFinal.id]
        );
        turnoRowFinal = updatedRows[0] || turnoRowFinal;
      } catch (e) {
        console.warn('[turnos][PG] No se pudo setear pago_id (crearTurno):', e?.message || e);
      }
    }

    res.status(201).json(mapTurnoRow(turnoRowFinal));

    // Presencial creado por admin: queda confirmado y se manda comprobante al instante.
    // Transferencia NO usa este endpoint (tiene /transferencia) y su email se manda al aprobar.
    if (!shouldSendEmail(req)) return;
    if (estadoToInsert !== 'confirmado') return;
    if (!turnoRowFinal?.email) return;

    const servicioRow = await getServicioForEmail(servicioId);
    const serviciosArr = [
      {
        title: servicioRow?.nombre || '',
        unit_price: Number(servicioRow?.precio || 0),
      },
    ];

    const extras = usuarioCreadoAhora && passwordGenerada
      ? { usuario: emailNorm, password: passwordGenerada }
      : '';

    setImmediate(async () => {
      try {
        const total = Number(turnoRowFinal.monto_total || 0) || Number(servicioRow?.precio || 0) || 0;
        const seniaPagada = Number(turnoRowFinal.monto_pagado || 0) || 0;
        const nombreEmail = await resolveNombreParaEmailFromTurnoRow(turnoRowFinal);

        await withTimeout(
          enviarComprobanteTurno({
            to: String(turnoRowFinal.email || '').trim(),
            nombre: nombreEmail,
            servicios: serviciosArr,
            seña: seniaPagada,
            total,
            pagoId: String(turnoRowFinal.pago_id || turnoRowFinal.id),
            fecha: formatFechaEmail(turnoRowFinal.fecha),
            hora: String(turnoRowFinal.hora || ''),
            restoAPagar: total - seniaPagada,
            extras,
          }),
          60000
        );

        await pgQuery('UPDATE turnos SET email_enviado = true, updated_at = now() WHERE id = $1', [turnoRowFinal.id]);
      } catch (mailError) {
        console.error('Error enviando comprobante de turno (PG, presencial):', mailError?.message || mailError);
      }
    });

    return;
  } catch (error) {
    // unique_violation (slot ya ocupado)
    if (error?.code === '23505') {
      return res.status(409).json({ mensaje: 'Horario no disponible' });
    }
    return res.status(400).json({ mensaje: error.message });
  }
};

// Devuelve todos los turnos, con opción de limitar la cantidad.
export const obtenerTurnos = async (req, res) => {
  try {
    // Si llega limit, ordena por más nuevos; si no, por fecha/hora.
    const limitRaw = req?.query?.limit;
    const limitParsed = Number.parseInt(String(limitRaw ?? ''), 10);
    const hasLimit = Number.isFinite(limitParsed) && limitParsed > 0;
    const safeLimit = hasLimit ? Math.min(limitParsed, 200) : null;

    const sqlBase =
      `SELECT t.*, u.username AS usuario_username, u.nombre AS usuario_nombre
              , s.nombre AS servicio_nombre
       FROM turnos t
       LEFT JOIN usuarios u ON u.id = t.usuario_id
       LEFT JOIN servicios s ON s.id = t.servicio_id`;

    const sql = hasLimit
      ? `${sqlBase}
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT $1`
      : `${sqlBase}
         ORDER BY t.fecha ASC, t.hora ASC`;

    const params = hasLimit ? [safeLimit] : [];
    const { rows } = await pgQuery(sql, params);
    return res.json(rows.map(mapTurnoRow));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

// Devuelve un turno puntual por ID.
export const obtenerTurno = async (req, res) => {
  try {
    // Busca el turno y adjunta los nombres relacionados.
    const { rows } = await pgQuery(
      `SELECT t.*, u.username AS usuario_username, u.nombre AS usuario_nombre
              , s.nombre AS servicio_nombre
       FROM turnos t
       LEFT JOIN usuarios u ON u.id = t.usuario_id
       LEFT JOIN servicios s ON s.id = t.servicio_id
       WHERE t.id = $1
       LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ mensaje: 'Turno no encontrado' });
    return res.json(mapTurnoRow(rows[0]));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

// Devuelve todos los turnos de un usuario.
export const obtenerTurnosPorUsuario = async (req, res) => {
  try {
    // Filtra por usuario y ordena cronológicamente.
    const usuarioId = req.params.usuarioId;
    const { rows } = await pgQuery(
      `SELECT t.*, u.username AS usuario_username, u.nombre AS usuario_nombre
              , s.nombre AS servicio_nombre
       FROM turnos t
       LEFT JOIN usuarios u ON u.id = t.usuario_id
       LEFT JOIN servicios s ON s.id = t.servicio_id
       WHERE t.usuario_id = $1
       ORDER BY t.fecha ASC, t.hora ASC`,
      [usuarioId]
    );
    return res.json(rows.map(mapTurnoRow));
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

// Actualiza un turno existente y valida reprogramaciones.
export const actualizarTurno = async (req, res) => {
  try {
    // Carga el estado previo para comparar cambios de fecha/hora.
    const id = req.params.id;
    const body = req.body || {};

    const { rows: beforeRows } = await pgQuery('SELECT * FROM turnos WHERE id = $1 LIMIT 1', [id]);
    const before = beforeRows[0];
    if (!before) return res.status(404).json({ mensaje: 'Turno no encontrado' });

    const beforeFecha = before.fecha instanceof Date ? before.fecha.toISOString().slice(0, 10) : String(before.fecha);
    const beforeHoraRaw = typeof before.hora === 'string' ? before.hora : before.hora?.toString?.() || '';
    const beforeHora = beforeHoraRaw ? normalizeHora(beforeHoraRaw.slice(0, 5)) : '';

    const fechaStr = body.fecha ? String(body.fecha).slice(0, 10) : null;
    const horaStr = body.hora ? normalizeHora(body.hora) : null;

    const servicioId = body.servicio ?? body.servicioId ?? null;

    const targetFecha = fechaStr || beforeFecha;
    const targetHora = horaStr || beforeHora;

    const fechaChanged = Boolean(fechaStr && fechaStr !== beforeFecha);
    const horaChanged = Boolean(horaStr && horaStr !== beforeHora);

    // Validar reprogramación (si cambia fecha u hora)
    if (fechaChanged || horaChanged) {
      const horariosPorDia = await getConfigHorariosPorDia();
      const horariosValidos = computeHorariosValidos(horariosPorDia, targetFecha);
      if (!horariosValidos.includes(targetHora)) {
        return res.status(409).json({ mensaje: `El horario ${targetHora} no está disponible para ese día.` });
      }

      const { rows: ocupadoRows } = await pgQuery(
        `SELECT 1
         FROM turnos
         WHERE id <> $1
           AND fecha = $2
           AND hora = $3
           AND estado IN ('pendiente','confirmado','en_proceso')
           AND (estado_transferencia IS NULL OR estado_transferencia <> 'rechazado')
         LIMIT 1`,
        [id, targetFecha, targetHora]
      );
      if (ocupadoRows[0]) {
        return res.status(409).json({ mensaje: `El horario ${targetHora} ya está reservado para esa fecha.` });
      }
    }

    const { rows } = await pgQuery(
      `UPDATE turnos
       SET servicio_id = COALESCE($2, servicio_id),
           fecha = COALESCE($3, fecha),
           hora = COALESCE($4, hora),
           estado = COALESCE($5, estado),
           email = COALESCE($6, email),
           nombre = COALESCE($7, nombre),
           telefono = COALESCE($8, telefono),
           comentario = COALESCE($9, comentario),
           registro_estadistica = COALESCE($10, registro_estadistica),
           monto_pagado = COALESCE($11, monto_pagado),
           monto_total = COALESCE($12, monto_total),
           email_enviado = COALESCE($13, email_enviado),
           senia_devuelta = COALESCE($14, senia_devuelta),
           comprobante_path = COALESCE($15, comprobante_path),
           estado_transferencia = COALESCE($16, estado_transferencia),
           motivo_rechazo_transferencia = COALESCE($17, motivo_rechazo_transferencia),
           titular_transferencia = COALESCE($18, titular_transferencia),
           metodo_transferencia = COALESCE($19, metodo_transferencia),
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        servicioId,
        fechaStr,
        horaStr,
        body.estado ?? null,
        body.email ?? null,
        body.nombre ?? null,
        body.telefono ?? null,
        body.comentario ?? null,
        body.registroEstadistica ?? null,
        body.montoPagado != null ? Number(body.montoPagado) : null,
        body.montoTotal != null ? Number(body.montoTotal) : null,
        typeof body.emailEnviado === 'boolean' ? body.emailEnviado : null,
        typeof body.seniaDevuelta === 'boolean' ? body.seniaDevuelta : null,
        body.comprobanteTransferencia ?? null,
        body.estadoTransferencia ?? null,
        body.motivoRechazoTransferencia ?? null,
        body.titularTransferencia ?? null,
        body.metodoTransferencia ?? null,
      ]
    );

    if (!rows[0]) return res.status(404).json({ mensaje: 'Turno no encontrado' });

    const updated = rows[0];
    res.json(mapTurnoRow(updated));

    // Email de reprogramación (no bloquear)
    if ((fechaChanged || horaChanged) && updated.email) {
      setImmediate(async () => {
        try {
          const { rows: srvRows } = await pgQuery('SELECT nombre, precio FROM servicios WHERE id = $1 LIMIT 1', [updated.servicio_id]);
          const srv = srvRows[0];
          const montoTotal = Number(updated.monto_total || 0) || Number(srv?.precio || 0) || 0;
          const montoPagado = Number(updated.monto_pagado || 0) || 0;
          const restoAPagar = Math.max(0, montoTotal - montoPagado);

          await withTimeout(
            enviarTurnoReprogramado({
              to: updated.email,
              nombre: updated.nombre || 'Cliente',
              servicio: srv?.nombre || 'Servicio',
              fechaAnterior: beforeFecha,
              horaAnterior: beforeHora,
              fechaNueva: targetFecha,
              horaNueva: targetHora,
              montoTotal,
              montoPagado,
              restoAPagar,
              pagoId: updated.pago_id || updated.id,
            }),
            60000
          );
        } catch (mailErr) {
          console.error('Error enviando mail de reprogramación (PG):', mailErr?.message || mailErr);
        }
      });
    }

    return;
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ mensaje: 'Horario no disponible' });
    }
    return res.status(400).json({ mensaje: error.message });
  }
};

// Elimina un turno por ID.
export const eliminarTurno = async (req, res) => {
  try {
    // Borra la fila y responde con error si no existía.
    const { rowCount } = await pgQuery('DELETE FROM turnos WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ mensaje: 'Turno no encontrado' });
    return res.json({ mensaje: 'Turno eliminado' });
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};
