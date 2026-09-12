// Corresponde a: app/controllers/reservas_controller.py + app/routes/reservas_routes.py
// OJO: sin prefix único en el backend -> rutas mezcladas (/mis-reservas, /reservar, /reservas/{id})
import { api } from './httpClient';

export interface ReservaCreate {
  estacion_ocm_id: string;
  cargador_id?: string;
  estacion_nombre?: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  estado?: string;
}

export interface ReservaUpdate extends Partial<ReservaCreate> {}

export interface Reserva extends ReservaCreate {
  id: string;
}

export async function misReservas(): Promise<Reserva[]> {
  const { data } = await api.get<Reserva[]>('/mis-reservas');
  return data;
}

export async function crearReserva(payload: ReservaCreate): Promise<Reserva> {
  const { data } = await api.post<Reserva>('/reservar', payload);
  return data;
}

export async function crearReservaConfirmada(payload: ReservaCreate): Promise<Reserva> {
  const { data } = await api.post<Reserva>('/reservar-confirmada', payload);
  return data;
}

export async function actualizarReserva(id: string, payload: ReservaUpdate): Promise<Reserva> {
  const { data } = await api.put<Reserva>(`/reservas/${id}`, payload);
  return data;
}

export async function cancelarReserva(id: string): Promise<Reserva> {
  const { data } = await api.patch<Reserva>(`/reservas/${id}/cancelar`);
  return data;
}

export async function eliminarReserva(id: string): Promise<void> {
  await api.delete(`/reservas/${id}`);
}
