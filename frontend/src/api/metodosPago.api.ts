// Corresponde a: app/controllers/metodo_pago_controller.py + app/routes/metodos_pago_routes.py
import { api } from './httpClient';

export interface MetodoPagoCreate {
  tipo: string;
  numero: string;
  estado?: boolean;
}

export interface MetodoPagoUpdate extends Partial<MetodoPagoCreate> {}

export interface MetodoPago extends MetodoPagoCreate {
  id: string;
  usuario_id: string;
  estado: boolean;
  created_at: string;
}

export async function listarMetodosPago(): Promise<MetodoPago[]> {
  const { data } = await api.get<MetodoPago[]>('/pagos');
  return data;
}

export async function crearMetodoPago(payload: MetodoPagoCreate): Promise<MetodoPago> {
  const { data } = await api.post<MetodoPago>('/pagos', payload);
  return data;
}

export async function actualizarMetodoPago(id: string, payload: MetodoPagoUpdate): Promise<MetodoPago> {
  const { data } = await api.put<MetodoPago>(`/pagos/${id}`, payload);
  return data;
}

export async function eliminarMetodoPago(id: string): Promise<void> {
  await api.delete(`/pagos/${id}`);
}
