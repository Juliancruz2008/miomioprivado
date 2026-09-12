import { api } from './httpClient';

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'compra' | 'pago' | 'reserva' | 'vehiculo' | 'reporte' | 'favorito' | 'calificacion' | 'sistema';
  leida: boolean;
  created_at: string;
}

export async function listarNotificaciones(): Promise<Notificacion[]> {
  const { data } = await api.get<Notificacion[]>('/notificaciones');
  return data;
}

export async function marcarNotificacionesLeidas(): Promise<void> {
  await api.patch('/notificaciones/leidas');
}