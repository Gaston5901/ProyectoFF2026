// Obtener turnos en proceso (para admin confirmar/rechazar transferencia)
export const obtenerTurnosEnProceso = async (req, res) => {
  try {
    // Traer todos los turnos en estado en_proceso (sin filtrar por transferencia ni presencial)
    const turnos = await TurnosModel.find({ estado: 'en_proceso' }).populate('usuario servicio');
    res.json(turnos);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Aprobar transferencia
export const aprobarTransferencia = async (req, res) => {
  try {
    const turno = await TurnosModel.findById(req.params.id).populate('servicio usuario');
    if (!turno) return res.status(404).json({ mensaje: 'Turno no encontrado' });
    turno.estadoTransferencia = 'aprobado';
    turno.motivoRechazoTransferencia = '';
    turno.estado = 'confirmado';
    // Guardar la seña como montoPagado (mitad del montoTotal)
    turno.montoPagado = Math.round((turno.montoTotal / 2) * 100) / 100;
    await turno.save();

    // Enviar mail de comprobante
    try {
      const { enviarComprobanteTurno } = await import('../helpers/emailSender.cjs');
      const servicioObj = turno.servicio && turno.servicio.nombre ? turno.servicio : await (await import('../models/serviciosSchema.js')).default.findById(turno.servicio);
      await enviarComprobanteTurno({
        to: turno.email,
        nombre: turno.nombre,
        servicios: [{ title: servicioObj.nombre, unit_price: servicioObj.precio }],
        seña: turno.montoPagado,
        total: turno.montoTotal,
        pagoId: turno._id,
        fecha: turno.fecha.toISOString().slice(0,10),
        hora: turno.hora,
        extras: undefined,
        restoAPagar: turno.montoTotal - turno.montoPagado
      });
    } catch (mailErr) {
      console.error('Error enviando mail de comprobante:', mailErr);
    }

    res.json({ mensaje: 'Transferencia aprobada', turno });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Rechazar transferencia
export const rechazarTransferencia = async (req, res) => {
  try {
    const turno = await TurnosModel.findById(req.params.id);
    if (!turno) return res.status(404).json({ mensaje: 'Turno no encontrado' });
    turno.estadoTransferencia = 'rechazado';
    turno.motivoRechazoTransferencia = (req.body && req.body.motivo) ? req.body.motivo : '';
    if (turno.estado === 'en_proceso') {
      turno.estado = 'rechazado';
    }
    await turno.save();
    res.json({ mensaje: 'Transferencia rechazada', turno });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};
// Crear turno con comprobante de transferencia (POST /transferencia)
export const crearTurnoTransferencia = async (req, res) => {
  try {
    console.log('BODY recibido:', req.body);
    console.log('FILE recibido:', req.file);
    // Datos del body y archivo
    const { email, nombre, telefono, servicio, fecha, hora, comentario, montoTotal } = req.body;
    const comprobanteFile = req.file;
    if (!comprobanteFile) {
      console.log('FALTA comprobante');
      return res.status(400).json({ mensaje: 'Debe adjuntar un comprobante de transferencia.' });
    }
    // Buscar usuario por email (igual que crearTurno)
    const emailNorm = String(email || '').toLowerCase().trim();
    let usuarioDoc = await UsuariosModel.findOne({ email: emailNorm });
    let usuarioId;
    let passwordGenerada = null;
    if (!usuarioDoc) {
      // Permitir que el admin pase una contraseña generada (por ejemplo, "temporal123")
      let passwordToUse = req.body.passwordGenerada;
      if (!passwordToUse) {
        const crypto = await import('crypto');
        passwordToUse = crypto.randomBytes(8).toString('hex');
      }
      passwordGenerada = passwordToUse;
      const nuevoUsuario = new UsuariosModel({
        nombre: nombre || '',
        email: emailNorm,
        username: emailNorm,
        telefono: telefono || '',
        password: passwordToUse,
        rol: 'cliente',
      });
      await nuevoUsuario.save();
      usuarioDoc = nuevoUsuario;
      usuarioId = nuevoUsuario._id;
    } else {
      usuarioId = usuarioDoc._id;
    }
    // Validar horario (igual que crearTurno)
    const ConfiguracionModel = (await import("../models/configuracionSchema.js")).default;
    const config = await ConfiguracionModel.findOne();
    const horariosPorDia = config?.horariosPorDia || {};
    const day = new Date(fecha + 'T00:00:00').getDay();
    let horaSolicitada = (hora || '').trim();
    if (/^\d{1,2}:\d{1,2}$/.test(horaSolicitada)) {
      const [hh, mm] = horaSolicitada.split(':');
      horaSolicitada = hh.padStart(2, '0') + ':' + mm.padStart(2, '0');
    }
    const limpiarHora = h => {
      let hora = String(h).trim();
      if (/^\d{1,2}:\d{1,2}$/.test(hora)) {
        const [hh, mm] = hora.split(':');
        hora = hh.padStart(2, '0') + ':' + mm.padStart(2, '0');
      }
      return hora;
    };
    const normales = Array.isArray(horariosPorDia[String(day)]) ? horariosPorDia[String(day)] : [];
    const extrasFecha = Array.isArray(horariosPorDia[fecha]) ? horariosPorDia[fecha] : [];
    const horariosValidos = Array.from(new Set([...normales, ...extrasFecha].map(limpiarHora)));
    if (!horariosValidos.includes(horaSolicitada)) {
      console.log('HORARIO NO DISPONIBLE:', horaSolicitada, horariosValidos);
      return res.status(409).json({ mensaje: `El horario ${horaSolicitada} no está disponible para ese día.` });
    }
    // Comprobar solapado (igual que crearTurno)
    const inicioDia = new Date(fecha + 'T00:00:00');
    const finDia = new Date(fecha + 'T23:59:59');
    const solapado = await TurnosModel.findOne({
      usuario: usuarioId,
      servicio,
      fecha: { $gte: inicioDia, $lte: finDia },
      hora: horaSolicitada,
      estado: { $in: ["pendiente", "confirmado"] }
    });
    if (solapado) {
      const objExist = solapado.toObject();
      objExist.id = objExist._id;
      delete objExist._id;
      console.log('TURNO SOLAPADO:', objExist);
      return res.status(200).json(objExist);
    }
    // Crear el turno con comprobante y estadoTransferencia
    const turno = new TurnosModel({
      usuario: usuarioId,
      nombre: usuarioDoc.nombre || nombre || '',
      telefono: usuarioDoc.telefono || telefono || '',
      email: usuarioDoc.email || emailNorm || '',
      servicio,
      fecha,
      hora: horaSolicitada,
      comentario: comentario || '',
      montoTotal: montoTotal || 0,
      comprobanteTransferencia: comprobanteFile.filename,
      estadoTransferencia: 'pendiente',
      metodoPago: 'transferencia',
      estado: 'en_proceso',
      titularTransferencia: req.body.titularTransferencia || '',
      metodoTransferencia: req.body.metodoTransferencia || '',
    });
    await turno.save();
    const resp = turno.toObject();
    resp.id = resp._id;
    delete resp._id;
    console.log('TURNO CREADO:', resp);
    res.status(201).json(resp);
    // (Opcional: enviar email de recepción de comprobante)
  } catch (error) {
    console.log('ERROR crearTurnoTransferencia:', error);
    res.status(400).json({ mensaje: error.message });
  }
};
// Marcar seña como devuelta
export const devolverSenia = async (req, res) => {
  try {
    const turno = await TurnosModel.findByIdAndUpdate(
      req.params.id,
      { seniaDevuelta: true, estado: 'cancelado' },
      { new: true }
    );
    if (!turno) return res.status(404).json({ mensaje: "Turno no encontrado" });
    const obj = turno.toObject();
    obj.id = obj._id;
    delete obj._id;
    obj.servicioId = obj.servicio?._id || obj.servicio;
    obj.usuarioId = obj.usuario?._id || obj.usuario;
    const fechaObj = new Date(obj.fecha);
    obj.fecha = fechaObj.toISOString().slice(0,10);
    obj.hora = obj.hora || '';
    obj.montoPagado = obj.montoPagado || 0;
    obj.pagoId = obj.pagoId || obj.id;
    res.json(obj);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};
import TurnosModel from "../models/turnosSchema.js";
import UsuariosModel from "../models/usuariosSchema.js";
import ServiciosModel from "../models/serviciosSchema.js";
import { enviarComprobanteTurno } from "../helpers/emailSender.cjs";

export const crearTurno = async (req, res) => {
  try {
    console.log('BODY RECIBIDO EN crearTurno:', req.body);
    const { email, nombre, telefono, servicio, fecha } = req.body;
    // Buscar usuario por email
    const emailNorm = String(email || '').toLowerCase().trim();
    let usuarioDoc = await UsuariosModel.findOne({ email: emailNorm });
    let usuarioId;
    let passwordGenerada = null;
    if (!usuarioDoc) {
      // Permitir que el admin pase una contraseña generada (por ejemplo, "temporal123")
      let passwordToUse = req.body.passwordGenerada;
      if (!passwordToUse) {
        const crypto = await import('crypto');
        passwordToUse = crypto.randomBytes(8).toString('hex');
      }
      passwordGenerada = passwordToUse;
      const nuevoUsuario = new UsuariosModel({
        nombre: nombre || '',
        email: emailNorm,
        username: emailNorm,
        telefono: telefono || '',
        password: passwordToUse,
        rol: 'cliente',
      });
      await nuevoUsuario.save();
      usuarioDoc = nuevoUsuario;
      usuarioId = nuevoUsuario._id;
    } else {
      usuarioId = usuarioDoc._id;
    }
    // Validar que el horario solicitado esté permitido según la configuración
    const ConfiguracionModel = (await import("../models/configuracionSchema.js")).default;
    const config = await ConfiguracionModel.findOne();
    const horariosPorDia = config?.horariosPorDia || {};
    const day = new Date(fecha + 'T00:00:00').getDay();
    // Normalizar horario solicitado a formato HH:MM
    let horaSolicitada = (req.body.hora || '').trim();
    // Forzar formato HH:MM
    if (/^\d{1,2}:\d{1,2}$/.test(horaSolicitada)) {
      const [hh, mm] = horaSolicitada.split(':');
      horaSolicitada = hh.padStart(2, '0') + ':' + mm.padStart(2, '0');
    }
    // Unir horarios normales y extras para la fecha (sin duplicados)
    const limpiarHora = h => {
      let hora = String(h).trim();
      // Forzar formato HH:MM para cualquier caso
      if (/^\d{1,2}:\d{1,2}$/.test(hora)) {
        const [hh, mm] = hora.split(':');
        hora = hh.padStart(2, '0') + ':' + mm.padStart(2, '0');
      }
      return hora;
    };
    // Siempre unir normales y extras para la fecha (sin duplicados)
    const normales = Array.isArray(horariosPorDia[String(day)]) ? horariosPorDia[String(day)] : [];
    const extrasFecha = Array.isArray(horariosPorDia[fecha]) ? horariosPorDia[fecha] : [];
    // Si hay extras, unir ambos arrays (no reemplazar)
    const horariosValidos = Array.from(new Set([...normales, ...extrasFecha].map(limpiarHora)));

    // --- LOGS DE DEPURACION ---
    console.log('CREAR TURNO: req.body:', {
      email: req.body.email,
      servicio: req.body.servicio,
      fecha: req.body.fecha,
      hora: req.body.hora,
    });
    console.log('CREAR TURNO: day, normales, extrasFecha:', day, normales, extrasFecha);
    console.log('CREAR TURNO: horariosValidos(normalizados):', horariosValidos);
    console.log('CREAR TURNO: horaSolicitada(normalizada):', horaSolicitada);

    if (!horariosValidos.includes(horaSolicitada)) {
      console.log('CREAR TURNO: RECHAZADO - horario no valido para esa fecha');
      return res.status(409).json({ mensaje: `El horario ${horaSolicitada} no está disponible para ese día.` });
    }
    // Buscar si ya existe un turno para ese usuario, servicio, fecha y hora exacta
    const inicioDia = new Date(fecha + 'T00:00:00');
    const finDia = new Date(fecha + 'T23:59:59');
    console.log('CREAR TURNO: Buscando solapado con:', { usuarioId: String(usuarioId), servicio, hora: horaSolicitada, inicioDia, finDia });

    // Si viene un pagoId, comprobar idempotencia: si ya existe un turno con ese pagoId+servicio+fecha+hora, devolverlo (evita duplicados)
    if (req.body.pagoId) {
      const existentePorPago = await TurnosModel.findOne({
        pagoId: req.body.pagoId,
        servicio,
        fecha: { $gte: inicioDia, $lte: finDia },
        hora: horaSolicitada,
      });
      if (existentePorPago) {
        const objExist = existentePorPago.toObject();
        objExist.id = objExist._id;
        delete objExist._id;
        objExist.servicioId = objExist.servicio?._id || objExist.servicio;
        objExist.usuarioId = objExist.usuario?._id || objExist.usuario;
        const fechaObjExist = new Date(objExist.fecha);
        objExist.fecha = fechaObjExist.toISOString().slice(0,10);
        objExist.hora = objExist.hora || '';
        objExist.montoPagado = objExist.montoPagado || 0;
        objExist.pagoId = objExist.pagoId || objExist.id;
        console.log('CREAR TURNO: existe por pagoId, devolviendo existente:', objExist.id);
        return res.status(200).json(objExist);
      }
    }

    const solapado = await TurnosModel.findOne({
      usuario: usuarioId,
      servicio,
      fecha: { $gte: inicioDia, $lte: finDia },
      hora: horaSolicitada,
      estado: { $in: ["pendiente", "confirmado"] }
    });
    console.log('CREAR TURNO: solapado encontrado:', !!solapado, solapado ? { id: solapado._id, fecha: solapado.fecha, hora: solapado.hora, estado: solapado.estado } : null);
    if (solapado) {
      // Idempotencia: si el turno ya existe para ese usuario/servicio/fecha/hora, devolvemos el existente.
      // Esto evita que el checkout falle en reintentos y previene duplicados.
      const objExist = solapado.toObject();
      objExist.id = objExist._id;
      delete objExist._id;
      objExist.servicioId = objExist.servicio?._id || objExist.servicio;
      objExist.usuarioId = objExist.usuario?._id || objExist.usuario;
      const fechaObjExist = new Date(objExist.fecha);
      objExist.fecha = fechaObjExist.toISOString().slice(0,10);
      objExist.hora = objExist.hora || '';
      objExist.montoPagado = objExist.montoPagado || 0;
      objExist.pagoId = objExist.pagoId || objExist.id;
      console.log('CREAR TURNO: ya existía (solapado), devolviendo existente:', objExist.id);
      return res.status(200).json(objExist);
    }
    // Crear el turno asociado al usuario correcto
    const turno = new TurnosModel({
      ...req.body,
      usuario: usuarioId,
      nombre: usuarioDoc.nombre || nombre || '',
      telefono: usuarioDoc.telefono || telefono || '',
      email: usuarioDoc.email || emailNorm || '',
    });
    await turno.save();

    // Responder al frontend lo antes posible (evita timeouts por envío de email lento)
    const resp = turno.toObject();
    resp.id = resp._id;
    delete resp._id;
    res.status(201).json(resp);

    const enviarEmail = req.body.enviarEmail !== false && req.body.enviarEmail !== 'false';
    if (!enviarEmail) {
      return;
    }

    // Obtener datos para el email
    const servicioDoc = await ServiciosModel.findById(turno.servicio);
    const serviciosArr = [{
      title: servicioDoc?.nombre || '',
      unit_price: servicioDoc?.precio || 0
    }];
    // Usar passwordGenerada si viene en el body (admin) o si se generó en este endpoint
    let extras = '';
    const passwordParaEmail = req.body.passwordGenerada || passwordGenerada;
    if (passwordParaEmail) {
      extras = {
        usuario: usuarioDoc?.email || emailNorm || email,
        password: passwordParaEmail
      };
    }
    console.log('EXTRAS EN EMAIL:', extras);
    // Enviar la fecha exactamente como fue seleccionada (yyyy-mm-dd string)
    let fechaParaComprobante = '';
    if (typeof turno.fecha === 'string') {
      fechaParaComprobante = turno.fecha.split('T')[0];
    } else if (turno.fecha instanceof Date) {
      // Si por alguna razón es Date, formatear a yyyy-mm-dd
      fechaParaComprobante = turno.fecha.toISOString().slice(0,10);
    } else {
      fechaParaComprobante = String(turno.fecha);
    }

    // Enviar email en background para no bloquear la respuesta
    const withTimeout = (promise, ms) =>
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`sendMail timeout ${ms}ms`)), ms)),
      ]);

    setImmediate(async () => {
      try {
        await withTimeout(
          enviarComprobanteTurno({
            to: usuarioDoc.email,
            nombre: usuarioDoc.nombre || '',
            servicios: serviciosArr,
            seña: turno.montoPagado || 0,
            total: turno.montoTotal || servicioDoc?.precio || 0,
            pagoId: turno.pagoId || turno._id,
            fecha: fechaParaComprobante,
            hora: turno.hora || '',
            restoAPagar: (turno.montoTotal || servicioDoc?.precio || 0) - (turno.montoPagado || 0),
            extras,
          }),
          60000
        );
        await TurnosModel.findByIdAndUpdate(turno._id, { emailEnviado: true });
      } catch (mailError) {
        console.error('Error enviando comprobante de turno (no bloquea la reserva):', mailError);
      }
    });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

export const obtenerTurnos = async (req, res) => {
  try {
    const turnos = await TurnosModel.find().populate("usuario servicio");
    // Mapear a formato esperado por frontend
    const turnosMap = turnos.map(t => {
      const obj = t.toObject();
      obj.id = obj._id;
      delete obj._id;
      // Si servicio es objeto, poner servicioId
      obj.servicioId = obj.servicio?._id || obj.servicio;
      // Si usuario es objeto, poner usuarioId
      obj.usuarioId = obj.usuario?._id || obj.usuario;
      // Formatear fecha a yyyy-MM-dd
      const fechaObj = new Date(obj.fecha);
      obj.fecha = fechaObj.toISOString().slice(0,10);
      // Usar el campo hora guardado en la base
      obj.hora = obj.hora || '';
      // Monto pagado y pagoId (dummy, ajustar si hay pagos)
      obj.montoPagado = obj.montoPagado || 0;
      obj.pagoId = obj.pagoId || obj.id;
      return obj;
    });
    res.json(turnosMap);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

export const obtenerTurno = async (req, res) => {
  try {
    const turno = await TurnosModel.findById(req.params.id).populate("usuario servicio");
    if (!turno) return res.status(404).json({ mensaje: "Turno no encontrado" });
    if (!turno) return res.status(404).json({ mensaje: "Turno no encontrado" });
    const obj = turno.toObject();
    obj.id = obj._id;
    delete obj._id;
    obj.servicioId = obj.servicio?._id || obj.servicio;
    obj.usuarioId = obj.usuario?._id || obj.usuario;
    const fechaObj = new Date(obj.fecha);
    obj.fecha = fechaObj.toISOString().slice(0,10);
    obj.hora = obj.hora || '';
    obj.montoPagado = obj.montoPagado || 0;
    obj.pagoId = obj.pagoId || obj.id;
    res.json(obj);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

export const actualizarTurno = async (req, res) => {
  try {
    const turno = await TurnosModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!turno) return res.status(404).json({ mensaje: "Turno no encontrado" });
    if (!turno) return res.status(404).json({ mensaje: "Turno no encontrado" });
    const obj = turno.toObject();
    obj.id = obj._id;
    delete obj._id;
    obj.servicioId = obj.servicio?._id || obj.servicio;
    obj.usuarioId = obj.usuario?._id || obj.usuario;
    const fechaObj = new Date(obj.fecha);
    obj.fecha = fechaObj.toISOString().slice(0,10);
    obj.hora = obj.hora || '';
    obj.montoPagado = obj.montoPagado || 0;
    obj.pagoId = obj.pagoId || obj.id;
    res.json(obj);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

export const eliminarTurno = async (req, res) => {
  try {
    const turno = await TurnosModel.findByIdAndDelete(req.params.id);
    if (!turno) return res.status(404).json({ mensaje: "Turno no encontrado" });
    res.json({ mensaje: "Turno eliminado" });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Turnos por usuario
export const obtenerTurnosPorUsuario = async (req, res) => {
  try {
    const turnos = await TurnosModel.find({ usuario: req.params.usuarioId }).populate("servicio");
    // Mapear a formato esperado por frontend
    const turnosMap = turnos.map(t => {
      const obj = t.toObject();
      obj.id = obj._id;
      delete obj._id;
      obj.servicioId = obj.servicio?._id || obj.servicio;
      obj.usuarioId = obj.usuario?._id || obj.usuario;
      const fechaObj = new Date(obj.fecha);
      obj.fecha = fechaObj.toISOString().slice(0,10);
      obj.hora = obj.hora || '';
      obj.montoPagado = obj.montoPagado || 0;
      obj.pagoId = obj.pagoId || obj.id;
      obj.titularTransferencia = obj.titularTransferencia || '';
      obj.metodoTransferencia = obj.metodoTransferencia || '';
      return obj;
    });
    res.json(turnosMap);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
