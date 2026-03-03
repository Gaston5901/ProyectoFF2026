const FALLBACK_API_URL = import.meta.env.PROD
  ? 'https://turnos-de-u-as.onrender.com/api'
  : 'http://localhost:4000/api';

export const API_BASE_URL = String(import.meta.env.VITE_API_URL || FALLBACK_API_URL).replace(
  /\/+$/,
  ''
);
