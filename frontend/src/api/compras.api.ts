import { api } from './httpClient';

export interface Compra {
  id: string;
  producto: string;
  monto: number;
  metodo: string;
  metodo_id?: string | null;
  transaccion_id: string;
  estado: string;
  created_at: string;
}

export async function listarCompras(): Promise<Compra[]> {
  const { data } = await api.get<Compra[]>('/compras');
  return data;
}
