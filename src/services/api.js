import axios from 'axios';

import { API_BASE_URL } from '../config/apiBaseUrl.js';

// Cliente HTTP centralizado para toda la app.
// Acá se define la URL base y la lógica común de autenticación/errores.
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Antes de cada request, agrega el token si el usuario ya inició sesión.
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  // Si el body es FormData, el navegador debe definir el Content-Type solo.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Si el backend responde 401, limpia la sesión y manda al login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        localStorage.removeItem('user');
      } catch {
        // ignore
      }
      // Evitar loops si ya estamos en login
      if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API de servicios: alta, baja, edición y listado.
export const serviciosAPI = {
  getAll: () => api.get('/servicios'),
  getById: (id) => api.get(`/servicios/${id}`),
  create: (data) => api.post('/servicios', data),
  update: (id, data) => api.put(`/servicios/${id}`, data),
  delete: (id) => api.delete(`/servicios/${id}`),
};

// API de usuarios: autenticación y mantenimiento de cuentas.
export const usuariosAPI = {
  getAll: () => api.get('/usuarios'),
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  delete: (id) => api.delete(`/usuarios/${id}`),
  login: (email, password) =>
    api.post('/usuarios/login', { email, password }).then(res => res.data),
  changePassword: (currentPassword, newPassword) =>
    api.post('/usuarios/cambiar-password', { currentPassword, newPassword }),
};

// API de turnos: CRUD y acciones puntuales como confirmar o aprobar transferencia.
export const turnosAPI = {
  getAll: (params) => (params ? api.get('/turnos', { params }) : api.get('/turnos')),
  getById: (id) => api.get(`/turnos/${id}`),
  create: (data) => api.post('/turnos', data),
  update: (id, data) => api.put(`/turnos/${id}`, data),
  delete: (id) => api.delete(`/turnos/${id}`),
  confirm: async (id) => api.patch(`/turnos/${id}`, { estado: 'confirmado' }),
  aprobarTransferencia: (id) => api.patch(`/turnos/${id}/aprobar-transferencia`, {}),
  getByUsuario: async (usuarioId) => {
    const response = await api.get(`/turnos/usuario/${usuarioId}`);
    return response.data;
  },
  getByFecha: async (fecha) => {
    const response = await api.get('/turnos');
    return response.data.filter((t) => t.fecha === fecha);
  },
};

// Configuración general del sistema.
export const configuracionAPI = {
  get: () => api.get('/configuracion'),
  update: (data) => api.patch('/configuracion', data),
};

// Horarios disponibles: combina horarios fijos, extras y turnos ocupados.
export const horariosAPI = {
  getPorDia: () => api.get('/configuracion/horariosPorDia'),
  setPorDia: (data) => api.put('/configuracion/horariosPorDia', data),
  getDisponibles: async (fecha) => {
    // Helper de compatibilidad: devuelve solo el arreglo de horarios disponibles.
    const estado = await horariosAPI.getEstadoDia(fecha);
    return estado.disponibles;
  },
  getEstadoDia: async (fecha, options = {}) => {
    // El día se calcula en base a la fecha recibida, arrancando desde medianoche.
    const day = new Date(fecha + 'T00:00:00').getDay();
    if (day === 0) return { dia: day, todos: [], ocupados: [], disponibles: [] };
    const [porDiaResp, turnos] = await Promise.all([
      api.get('/configuracion/horariosPorDia'),
      turnosAPI.getByFecha(fecha),
    ]);
    const horariosPorDia = porDiaResp.data || {};
    // Horarios normales del día de la semana y horarios extra para esa fecha puntual.
    const normales = Array.isArray(horariosPorDia[String(day)]) ? horariosPorDia[String(day)] : [];
    const extras = Array.isArray(horariosPorDia[fecha]) ? horariosPorDia[fecha] : [];
    // Unifica y ordena horarios, eliminando duplicados.
    const limpiarHora = h => String(h).trim().padStart(5, '0');
    const todos = Array.from(new Set([...normales, ...extras].map(limpiarHora))).sort((a, b) => {
      const [ah, am] = a.split(':').map(Number);
      const [bh, bm] = b.split(':').map(Number);
      return ah !== bh ? ah - bh : am - bm;
    });
    // Calcula qué horarios ya están ocupados por turnos activos.
    const ignoreTurnoId = options?.ignoreTurnoId;
    const turnosFiltrados = ignoreTurnoId
      ? turnos.filter((t) => String(t?.id ?? t?._id ?? '') !== String(ignoreTurnoId))
      : turnos;

    const ocupados = turnosFiltrados
      .filter(t => (
        (["pendiente", "confirmado"].includes(t.estado) && t.estadoTransferencia !== 'rechazado') ||
        (t.estado === 'en_proceso' && t.estadoTransferencia !== 'rechazado')
      ))
      .map(t => t.hora);
    const disponibles = todos.filter(h => !ocupados.includes(h));
    return { dia: day, todos, ocupados, disponibles };
  }
};

// Historial de turnos.
export const historialAPI = {
  getAll: () => api.get('/historialTurnos'),
  create: (data) => api.post('/historialTurnos', data),
};

// Carrito persistido en backend.
export const carritoAPI = {
  getAll: () => api.get('/carrito'),
  add: (data) => api.post('/carrito', data),
  remove: (id) => api.delete(`/carrito/${id}`),
  clear: async () => {
    // Trae todos los items y los borra uno por uno.
    const response = await api.get('/carrito');
    await Promise.all(response.data.map((item) => api.delete(`/carrito/${item.id}`)));
  },
};

export default api;
