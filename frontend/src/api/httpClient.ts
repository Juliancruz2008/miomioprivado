// Cliente HTTP centralizado con Axios.
// Todos los archivos en src/api/*.api.ts deben usar `api` (esta instancia), nunca fetch directo.

import axios, { type AxiosError } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el token guardado en localStorage a cada request saliente.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ev_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
    this.status = status;
  }
}

// Normaliza cualquier error de Axios a ApiError, usando el `detail` que manda FastAPI.
// Si el token expiró (401) lo limpia para forzar login de nuevo.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status ?? 0;
    const message = error.response?.data?.detail || error.message || 'Error en la solicitud';

    if (status === 401) {
      localStorage.removeItem('ev_token');
    }

    return Promise.reject(new ApiError(message, status));
  },
);
