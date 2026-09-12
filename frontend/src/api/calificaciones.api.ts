// Corresponde a: app/controllers/calificaciones_controller.py + app/routes/calificaciones_routes.py
// OJO: sin prefix único -> /calificaciones, /mis-calificaciones, /calificaciones/{estacion_id} (pública)
import { api } from './httpClient';

export interface CalificacionCreate {
  estacion_ocm_id: string;
  estacion_nombre?: string;
  puntaje: number;
  comentario?: string;
}

export interface CalificacionUpdate {
  puntaje: number;
  comentario?: string;
}

export interface Calificacion extends CalificacionCreate {
  id: string;
  fecha: string;
}

export interface CalificacionPublica {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  puntaje: number;
  comentario: string;
  fecha: string;
}

export interface ResumenCalificaciones {
  promedio: number;
  total: number;
  calificaciones: CalificacionPublica[];
}

export async function calificar(payload: CalificacionCreate): Promise<Calificacion> {
  const { data } = await api.post<Calificacion>('/calificaciones', payload);
  return data;
}

export async function misCalificaciones(): Promise<Calificacion[]> {
  const { data } = await api.get<Calificacion[]>('/mis-calificaciones');
  return data;
}

export async function actualizarCalificacion(id: string, payload: CalificacionUpdate): Promise<Calificacion> {
  const { data } = await api.put<Calificacion>(`/calificaciones/${id}`, payload);
  return data;
}

export async function eliminarCalificacion(id: string): Promise<void> {
  await api.delete(`/calificaciones/${id}`);
}

// Pública, no requiere auth
export async function calificacionesDeEstacion(estacionId: string): Promise<ResumenCalificaciones> {
  const { data } = await api.get<ResumenCalificaciones>(`/calificaciones/${estacionId}`);
  return data;
}
