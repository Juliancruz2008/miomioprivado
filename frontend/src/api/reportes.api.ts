// Corresponde a: app/controllers/reportes_controller.py + app/routes/reportes_routes.py
// OJO: sin prefix único -> /reportes, /mis-reportes, /reportes/{estacion_id} (pública, sin auth)
import { api } from './httpClient';

export interface ReporteCreate {
  estacion_ocm_id: string;
  estacion_nombre?: string;
  tipo: string;
  descripcion?: string;
}

export interface ReporteUpdate {
  tipo?: string;
  descripcion?: string;
  estado?: string;
}

export interface Reporte extends ReporteCreate {
  id: string;
  estado?: string;
  fecha: string;
}

export async function crearReporte(payload: ReporteCreate): Promise<Reporte> {
  const { data } = await api.post<Reporte>('/reportes', payload);
  return data;
}

export async function misReportes(): Promise<Reporte[]> {
  const { data } = await api.get<Reporte[]>('/mis-reportes');
  return data;
}

export async function actualizarReporte(id: string, payload: ReporteUpdate): Promise<Reporte> {
  const { data } = await api.put<Reporte>(`/reportes/${id}`, payload);
  return data;
}

export async function eliminarReporte(id: string): Promise<void> {
  await api.delete(`/reportes/${id}`);
}

// Pública, no requiere auth (útil para el popup de una estación en el mapa)
export async function reportesDeEstacion(estacionId: string): Promise<Reporte[]> {
  const { data } = await api.get<Reporte[]>(`/reportes/${estacionId}`);
  return data;
}
