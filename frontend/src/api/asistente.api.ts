import { api } from './httpClient';

export type MensajeAsistente = { role: 'user' | 'assistant'; content: string };
export type RespuestaAsistente = { respuesta: string; sugerencias: string[]; respaldo_local: boolean };

export async function preguntarAsistente(pregunta: string, historial: MensajeAsistente[]) {
  const { data } = await api.post<RespuestaAsistente>('/asistente/chat', { pregunta, historial });
  return data;
}
