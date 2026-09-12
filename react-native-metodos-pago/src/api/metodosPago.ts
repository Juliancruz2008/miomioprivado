import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 10.0.2.2 apunta al equipo host desde Android Emulator; el navegador necesita localhost.
const DEFAULT_API_URL = Platform.OS === 'web' ? 'http://127.0.0.1:8000' : 'http://10.0.2.2:8000';
const API_URL = (process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL).replace(/\/$/, '');
const TOKEN_KEY = 'ev_token';
const DEMO_KEY = 'ev_charge_demo_metodos_pago';
// El modo demo se activa solo si no hay sesión. Se puede desactivar al publicar con EXPO_PUBLIC_DEMO_MODE=false.
const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE !== 'false';

export type MetodoPago = {
  id: string;
  usuario_id: string;
  tipo: string;
  numero: string;
  estado: boolean;
  created_at: string;
};

export type MetodoPagoPayload = {
  tipo: string;
  numero: string;
  estado?: boolean;
};

export async function guardarTokenSesion(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

async function iniciarSesionDemo() {
  if (!DEMO_MODE) return false;
  try {
    const response = await fetch(`${API_URL}/auth/demo`, { method: 'POST', headers: { Accept: 'application/json' } });
    if (!response.ok) return false;
    const data = await response.json() as { access_token?: string };
    if (!data.access_token) return false;
    await guardarTokenSesion(data.access_token);
    return true;
  } catch {
    return false;
  }
}

export async function estaEnModoDemo() {
  if (await AsyncStorage.getItem(TOKEN_KEY)) return false;
  if (await iniciarSesionDemo()) return false;
  return DEMO_MODE;
}

const demoInicial: MetodoPago[] = [{
  id: 'demo-visa-4242', usuario_id: 'demo', tipo: 'Visa', numero: '**** 4242', estado: true, created_at: new Date().toISOString(),
}];

async function listarDemo() {
  const guardados = await AsyncStorage.getItem(DEMO_KEY);
  if (!guardados) {
    await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(demoInicial));
    return demoInicial;
  }
  return JSON.parse(guardados) as MetodoPago[];
}

async function guardarDemo(metodos: MetodoPago[]) {
  await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(metodos));
  return metodos;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('No hay una sesión activa. Inicia sesión antes de administrar tus métodos de pago.');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail ?? 'No se pudo completar la operación.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function listarMetodosPago() {
  if (await estaEnModoDemo()) return listarDemo();
  return request<MetodoPago[]>('/pagos');
}

export async function crearMetodoPago(payload: MetodoPagoPayload) {
  if (await estaEnModoDemo()) {
    const metodos = await listarDemo();
    const nuevo: MetodoPago = { ...payload, estado: payload.estado ?? true, id: `demo-${Date.now()}`, usuario_id: 'demo', created_at: new Date().toISOString() };
    await guardarDemo([...metodos, nuevo]);
    return nuevo;
  }
  return request<MetodoPago>('/pagos', { method: 'POST', body: JSON.stringify(payload) });
}

export async function actualizarMetodoPago(id: string, payload: Partial<MetodoPagoPayload>) {
  if (await estaEnModoDemo()) {
    const metodos = await listarDemo();
    const indice = metodos.findIndex((metodo) => metodo.id === id);
    if (indice < 0) throw new Error('Método de pago no encontrado.');
    const actualizado = { ...metodos[indice], ...payload };
    metodos[indice] = actualizado;
    await guardarDemo(metodos);
    return actualizado;
  }
  return request<MetodoPago>(`/pagos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function eliminarMetodoPago(id: string) {
  if (await estaEnModoDemo()) {
    const metodos = await listarDemo();
    await guardarDemo(metodos.filter((metodo) => metodo.id !== id));
    return;
  }
  return request<void>(`/pagos/${id}`, { method: 'DELETE' });
}
