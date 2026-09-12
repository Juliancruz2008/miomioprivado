import { api } from './httpClient';

export interface Contacto {
  id: string;
  usuario_id?: string;
  nombre: string;
  apellido?: string;
  correo: string;
  mensaje: string;
  respuesta?: string;
  estado: 'pendiente' | 'respondido';
  fecha_envio: string;
  fecha_respuesta?: string;
}

export async function enviarContacto(payload: { nombre: string; apellido: string; correo: string; mensaje: string }): Promise<Contacto> {
  const { data } = await api.post<Contacto>('/contacto', payload);
  return data;
}