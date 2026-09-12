// Corresponde a: app/controllers/estado_controller.py + app/routes/estado_routes.py
import { api } from './httpClient';

export interface EstadoEstacion {
  estacion_ocm_id: string;
  cargadores_reservados?: string[];
  [key: string]: unknown;
}

// Pública, no requiere auth
export async function obtenerEstadoEstacion(estacionId: string): Promise<EstadoEstacion> {
  const { data } = await api.get<EstadoEstacion>(`/estado/${estacionId}`);
  return data;
}
