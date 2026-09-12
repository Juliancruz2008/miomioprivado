// Corresponde a: app/controllers/admin_controller.py + app/routes/admin_routes.py
// Todas requieren usuario admin (require_admin en el backend).
import { api } from './httpClient';

export interface AdminEstadisticas {
  total_usuarios: number;
  total_vehiculos: number;
  total_reservas_activas: number;
  total_cargas: number;
  total_kwh_cargados: number;
  total_reportes_abiertos: number;
  total_estaciones_propias: number;
}

export interface EstacionPropiaCreate {
  id?: string;
  nombre: string;
  direccion?: string;
  lat: number;
  lon: number;
  tipo_conector: string;
  potencia_kw: number;
  descripcion?: string;
  activa?: boolean;
  estado?: 'activa' | 'mantenimiento' | 'inactiva';
  operador?: string;
  cargadores?: EstacionCargadorData[];
}

export interface EstacionCargadorData {
  id?: string;
  tipo_conector: string;
  potencia_kw: number;
  corriente?: string;
  bahias?: number;
}

export interface AdminEstacionOcm {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lon: number;
  estado: 'activa' | 'mantenimiento' | 'inactiva';
  origen: string;
  operador: string;
  conectores: Array<{
    tipo: string;
    potencia_kw?: number;
    corriente: string;
    bahias: number;
  }>;
}

export interface AdminReservaUpdate {
  estado?: string;
  fecha_hora_inicio?: string;
  fecha_hora_fin?: string;
}

export interface UserAdmin {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
  is_admin: boolean;
  created_at?: string;
}

export interface UsuarioInfo {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
}

export interface AdminReservaDetail {
  id: string;
  usuario_id: string;
  usuario: UsuarioInfo;
  estacion_ocm_id: string;
  cargador_id?: string;
  estacion_nombre: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  estado: string;
  created_at: string;
}

export interface ReporteAdmin {
  id: string;
  usuario_id: string;
  estacion_ocm_id: string;
  estacion_nombre?: string;
  tipo: string;
  descripcion?: string;
  estado: string;
  fecha: string;
  usuario?: UsuarioInfo;
}

export interface CalificacionAdmin {
  id: string;
  usuario_id: string;
  estacion_ocm_id: string;
  estacion_nombre?: string;
  puntaje: number;
  comentario?: string;
  fecha: string;
  usuario_nombre?: string;
}

export interface ContactoAdmin {
  id: string;
  usuario_id?: string;
  nombre: string;
  apellido?: string;
  correo: string;
  mensaje: string;
  respuesta?: string;
  estado: 'pendiente' | 'respondido';
  fecha_envio: string;
  fecha_respuesta?: string;
}

export interface AdminNotificacion {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_email: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  created_at: string;
}

export async function listarUsuarios(busqueda?: string): Promise<UserAdmin[]> {
  const { data } = await api.get<UserAdmin[]>('/admin/usuarios', { params: busqueda ? { busqueda } : {} });
  return data;
}

export async function actualizarUsuarioAdmin(id: string, payload: Partial<UserAdmin>): Promise<UserAdmin> {
  const { data } = await api.put<UserAdmin>(`/admin/usuarios/${id}`, payload);
  return data;
}

export async function listarNotificacionesAdmin(): Promise<AdminNotificacion[]> {
  const { data } = await api.get<AdminNotificacion[]>('/admin/notificaciones');
  return data;
}

export async function obtenerEstadisticas(): Promise<AdminEstadisticas> {
  const { data } = await api.get<AdminEstadisticas>('/admin/estadisticas');
  return data;
}

export async function listarReportesAdmin(): Promise<ReporteAdmin[]> {
  const { data } = await api.get<ReporteAdmin[]>('/admin/reportes');
  return data;
}

export async function resolverReporte(id: string): Promise<unknown> {
  const { data } = await api.patch(`/admin/reportes/${id}/resolver`);
  return data;
}

export async function cambiarEstadoReporte(id: string, estado: 'abierto' | 'mantenimiento' | 'resuelto' | 'fuera_servicio'): Promise<unknown> {
  const { data } = await api.patch(`/admin/reportes/${id}/estado`, { estado });
  return data;
}

export async function listarEstacionesAdmin(): Promise<unknown[]> {
  const { data } = await api.get('/admin/estaciones');
  return data;
}

export async function crearEstacion(payload: EstacionPropiaCreate): Promise<unknown> {
  const { data } = await api.post('/admin/estaciones', payload);
  return data;
}

export async function actualizarEstacion(id: string, payload: EstacionPropiaCreate): Promise<unknown> {
  const { data } = await api.put(`/admin/estaciones/${id}`, payload);
  return data;
}

export async function cambiarEstadoEstacion(id: string, estado: 'activa' | 'mantenimiento' | 'inactiva'): Promise<unknown> {
  const { data } = await api.patch(`/admin/estaciones/${id}/estado`, { estado });
  return data;
}

export async function cambiarEstadoEstacionOcm(id: string, estado: 'activa' | 'mantenimiento' | 'inactiva'): Promise<unknown> {
  const { data } = await api.patch(`/admin/estaciones-ocm/${id}/estado`, { estado });
  return data;
}

export async function listarEstacionesOcmAdmin(): Promise<AdminEstacionOcm[]> {
  const { data } = await api.get<AdminEstacionOcm[]>('/admin/estaciones-ocm');
  return data;
}

export async function actualizarEstacionOcm(id: string, payload: Partial<AdminEstacionOcm>): Promise<unknown> {
  const { data } = await api.put(`/admin/estaciones-ocm/${id}`, payload);
  return data;
}

export async function eliminarEstacionOcmAdmin(id: string): Promise<void> {
  await api.delete(`/admin/estaciones-ocm/${id}`);
}

export async function eliminarEstacionAdmin(id: string): Promise<void> {
  await api.delete(`/admin/estaciones/${id}`);
}

export async function listarReservasAdmin(): Promise<AdminReservaDetail[]> {
  const { data } = await api.get<AdminReservaDetail[]>('/admin/reservas');
  return data;
}

export async function actualizarReservaAdmin(id: string, payload: AdminReservaUpdate): Promise<unknown> {
  const { data } = await api.put(`/admin/reservas/${id}`, payload);
  return data;
}

export async function eliminarReservaAdmin(id: string): Promise<void> {
  await api.delete(`/admin/reservas/${id}`);
}

export async function listarCalificacionesAdmin(): Promise<CalificacionAdmin[]> {
  const { data } = await api.get<CalificacionAdmin[]>('/admin/calificaciones');
  return data;
}

export async function listarContactosAdmin(): Promise<ContactoAdmin[]> {
  const { data } = await api.get<ContactoAdmin[]>('/admin/contactos');
  return data;
}

export async function responderContactoAdmin(id: string, respuesta: string): Promise<ContactoAdmin> {
  const { data } = await api.patch<ContactoAdmin>(`/admin/contactos/${id}/respuesta`, { respuesta });
  return data;
}
