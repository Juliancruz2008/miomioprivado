import { api } from './httpClient';

export interface ReservaCotizacion {
  estacion_nombre: string;
  operador?: string;
  tipo_cargador: string;
  potencia_kw?: number;
  duracion_horas: number;
}

export interface CotizacionReserva {
  horas: number;
  tarifa_hora: number;
  factor_estacion: number;
  total: number;
}

export async function cotizarReserva(payload: ReservaCotizacion): Promise<CotizacionReserva> {
  const { data } = await api.post<CotizacionReserva>('/reservas/cotizar', payload);
  return data;
}
