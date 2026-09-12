// Corresponde a: app/controllers/favoritos_controller.py + app/routes/favoritos_routes.py
import { api } from './httpClient';

export interface FavoritoCreate {
  estacion_ocm_id: string;
  estacion_nombre?: string;
}

export interface Favorito extends FavoritoCreate {
  id: string;
}

export async function listarFavoritos(): Promise<Favorito[]> {
  const { data } = await api.get<Favorito[]>('/favoritos');
  return data;
}

export async function agregarFavorito(payload: FavoritoCreate): Promise<Favorito> {
  const { data } = await api.post<Favorito>('/favoritos', payload);
  return data;
}

export async function quitarFavorito(estacionOcmId: string): Promise<void> {
  await api.delete(`/favoritos/${estacionOcmId}`);
}
