// Corresponde a: app/controllers/cargas_controller.py + app/routes/cargas_routes.py
import { api } from './httpClient';

export interface CargaCreate {
  estacion_ocm_id: string;
  cargador_id?: string;
  estacion_nombre?: string;
  kwh_cargados: number;
  costo_estimado: number;
  notas?: string;
}

export interface Carga extends CargaCreate {
  id: string;
  estado: 'pendiente' | 'validada' | 'rechazada';
  fecha?: string;
}

export interface CargasEstadisticas {
  total_kwh: number;
  total_costo: number;
  total_sesiones?: number;
  total_cargas: number;
  [key: string]: unknown;
}

export async function estadisticasCargas(): Promise<CargasEstadisticas> {
  const { data } = await api.get<CargasEstadisticas>('/cargas/estadisticas');
  return data;
}

export async function listarCargas(): Promise<Carga[]> {
  const { data } = await api.get<Carga[]>('/cargas');
  return data;
}

export async function crearCarga(payload: CargaCreate): Promise<Carga> {
  const { data } = await api.post<Carga>('/cargas', payload);
  return data;
}
