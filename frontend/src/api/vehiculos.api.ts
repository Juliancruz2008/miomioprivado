// Corresponde a: app/controllers/vehiculo_controller.py + app/routes/vehiculos_routes.py
import { api } from './httpClient';

export interface VehiculoCreate {
  marca: string;
  modelo: string;
  anio?: number;
  autonomia_km?: number;
  tipo_conector: string;
  activo?: boolean;
}

export interface VehiculoUpdate extends Partial<VehiculoCreate> {}

export interface Vehiculo extends VehiculoCreate {
  id: string;
}

export async function listarVehiculos(): Promise<Vehiculo[]> {
  const { data } = await api.get<Vehiculo[]>('/vehiculos');
  return data;
}

export async function crearVehiculo(payload: VehiculoCreate): Promise<Vehiculo> {
  const { data } = await api.post<Vehiculo>('/vehiculos', payload);
  return data;
}

export async function actualizarVehiculo(id: string, payload: VehiculoUpdate): Promise<Vehiculo> {
  const { data } = await api.put<Vehiculo>(`/vehiculos/${id}`, payload);
  return data;
}

export async function eliminarVehiculo(id: string): Promise<void> {
  await api.delete(`/vehiculos/${id}`);
}
