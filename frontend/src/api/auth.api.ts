// Corresponde a: app/controllers/auth_controller.py + app/routes/auth_routes.py
import { api, ApiError } from './httpClient';

export interface Usuario {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  vehiculos_rel?: Array<{ autonomia_km?: number }>;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}

export interface PerfilOut {
  usuario: Usuario;
  vehiculo_activo: unknown | null;
}

// POST /auth/login — el backend usa OAuth2PasswordRequestForm, va form-urlencoded, no JSON.
export async function login(email: string, password: string): Promise<TokenOut> {
  const form = new URLSearchParams({ username: email, password });
  const { data } = await api.post<TokenOut>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  localStorage.setItem('ev_token', data.access_token);
  return data;
}

// POST /auth/registro
export async function registro(
  nombre: string,
  apellido: string,
  email: string,
  password: string,
): Promise<TokenOut> {
  const { data } = await api.post<TokenOut>('/auth/registro', { nombre, apellido, email, password });
  return data;
}

// GET /auth/perfil
export async function obtenerPerfil(): Promise<PerfilOut> {
  const { data } = await api.get<PerfilOut>('/auth/perfil');
  return data;
}

// PUT /auth/perfil
export async function actualizarPerfil(payload: {
  nombre?: string;
  apellido?: string;
  email?: string;
}): Promise<{ usuario: Usuario }> {
  const { data } = await api.put<{ usuario: Usuario }>('/auth/perfil', payload);
  return data;
}

// PUT /auth/password: cambio de contraseña desde el perfil con sesión iniciada.
export async function cambiarPassword(oldPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  const { data } = await api.put<{ ok: boolean }>('/auth/password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return data;
}

export function logout() {
  localStorage.removeItem('ev_token');
}

export { ApiError };
