import axios from 'axios';

import { API_BASE_URL } from '../config/apiBaseUrl.js';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token si existe
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  // No agregar Content-Type si es FormData
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Servicios
export const serviciosAPI = {
  getAll: () => api.get('/servicios'),
  getById: (id) => api.get(`/servicios/${id}`),
  create: (data) => api.post('/servicios', data),
  update: (id, data) => api.put(`/servicios/${id}`, data),
  delete: (id) => api.delete(`/servicios/${id}`),
};

// Usuarios
export const usuariosAPI = {
  getAll: () => api.get('/usuarios'),
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  login: (email, password) =>
    api.post('/usuarios/login', { email, password }).then(res => res.data),
};

// Turnos
export const turnosAPI = {
  getAll: () => api.get('/turnos'),
  getById: (id) => api.get(`/turnos/${id}`),
  create: (data) => api.post('/turnos', data),
  update: (id, data) => api.put(`/turnos/${id}`, data),
  delete: (id) => api.delete(`/turnos/${id}`),
  confirm: async (id) => api.patch(`/turnos/${id}`, { estado: 'confirmado' }),
  getByUsuario: async (usuarioId) => {
    const response = await api.get(`/turnos/usuario/${usuarioId}`);
    return response.data;
  },
  getByFecha: async (fecha) => {
    const response = await api.get('/turnos');
    return response.data.filter((t) => t.fecha === fecha);
  },
};

// Configuración
export const configuracionAPI = {
  get: () => api.get('/configuracion'),
  update: (data) => api.patch('/configuracion', data),
};

// Horarios Disponibles
export const horariosAPI = {
  getPorDia: () => api.get('/configuracion/horariosPorDia'),
  setPorDia: (data) => api.put('/configuracion/horariosPorDia', data),
  getDisponibles: async (fecha) => {
    // Compatibilidad: retorna solo disponibles del día
    const estado = await horariosAPI.getEstadoDia(fecha);
    return estado.disponibles;
  },
  getEstadoDia: async (fecha) => {
    const day = new Date(fecha + 'T00:00:00').getDay();
    if (day === 0) return { dia: day, todos: [], ocupados: [], disponibles: [] };
    const [porDiaResp, turnos] = await Promise.all([
      api.get('/configuracion/horariosPorDia'),
      turnosAPI.getByFecha(fecha),
    ]);
    const horariosPorDia = porDiaResp.data || {};
    const normales = Array.isArray(horariosPorDia[String(day)]) ? horariosPorDia[String(day)] : [];
    const extras = Array.isArray(horariosPorDia[fecha]) ? horariosPorDia[fecha] : [];
    // Unir y limpiar duplicados, igual que en el frontend cliente
    const limpiarHora = h => String(h).trim().padStart(5, '0');
    const todos = Array.from(new Set([...normales, ...extras].map(limpiarHora))).sort((a, b) => {
      const [ah, am] = a.split(':').map(Number);
      const [bh, bm] = b.split(':').map(Number);
      return ah !== bh ? ah - bh : am - bm;
    });
    // Considerar ocupados:
    // - Todos los turnos 'pendiente', 'confirmado', 'en_proceso' (excepto los 'en_proceso' rechazados)
    // - Si el turno está 'en_proceso', bloquear el horario hasta que se confirme o rechace
    const ocupados = turnos
      .filter(t => (
        (["pendiente", "confirmado"].includes(t.estado) && t.estadoTransferencia !== 'rechazado') ||
        (t.estado === 'en_proceso' && t.estadoTransferencia !== 'rechazado')
      ))
      .map(t => t.hora);
    const disponibles = todos.filter(h => !ocupados.includes(h));
    return { dia: day, todos, ocupados, disponibles };
  }
};

// Historial
export const historialAPI = {
  getAll: () => api.get('/historialTurnos'),
  create: (data) => api.post('/historialTurnos', data),
};

// Carrito
export const carritoAPI = {
  getAll: () => api.get('/carrito'),
  add: (data) => api.post('/carrito', data),
  remove: (id) => api.delete(`/carrito/${id}`),
  clear: async () => {
    const response = await api.get('/carrito');
    await Promise.all(response.data.map((item) => api.delete(`/carrito/${item.id}`)));
  },
};

export default api;
