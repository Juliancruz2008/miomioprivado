import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── 1. Configuración ────────────────────────────────────────────────────────
// El navegador usa localhost. El emulador Android usa 10.0.2.2 para acceder al PC.
const DEFAULT_API_URL = Platform.OS === 'web' ? 'http://127.0.0.1:8000' : 'http://10.0.2.2:8000';
const API_URL = (process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL).replace(/\/$/, '');
const TOKEN_KEY = 'ev_token';
const DEMO_KEY = 'ev_charge_demo_metodos_pago';
// Para producción se puede desactivar con EXPO_PUBLIC_DEMO_MODE=false.
const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE !== 'false';

// ─── 2. Tipos de datos ───────────────────────────────────────────────────────
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

// ─── 3. Sesión y modo demo ────────────────────────────────────────────────────
// Guarda el JWT que usará la API en las siguientes peticiones.
export async function guardarTokenSesion(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

// Pide al backend una sesión de prueba. No muestra ningún formulario de login.
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

// ─── 4. Respaldo local ────────────────────────────────────────────────────────
// Solo se usa si no hay sesión demo y el backend no está disponible.
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

// ─── 5. Petición autenticada al backend ──────────────────────────────────────
async function requestApi<T>(path: string, options: RequestInit = {}, retryDemo = true): Promise<T> {
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

  if (response.status === 401 && DEMO_MODE && retryDemo) {
    // Si el JWT demo expiró, se renueva una sola vez y se repite la petición.
    await AsyncStorage.removeItem(TOKEN_KEY);
    if (await iniciarSesionDemo()) return requestApi<T>(path, options, false);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail ?? 'No se pudo completar la operación.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ─── 6. Operaciones CRUD públicas ────────────────────────────────────────────
// READ: obtiene todos los métodos del usuario autenticado.
export async function listarMetodosPago() {
  if (await estaEnModoDemo()) return listarDemo();
  return requestApi<MetodoPago[]>('/pagos');
}

// CREATE: registra un método nuevo.
export async function crearMetodoPago(payload: MetodoPagoPayload) {
  if (await estaEnModoDemo()) {
    const metodos = await listarDemo();
    const nuevo: MetodoPago = { ...payload, estado: payload.estado ?? true, id: `demo-${Date.now()}`, usuario_id: 'demo', created_at: new Date().toISOString() };
    await guardarDemo([...metodos, nuevo]);
    return nuevo;
  }
  return requestApi<MetodoPago>('/pagos', { method: 'POST', body: JSON.stringify(payload) });
}

// UPDATE: cambia los datos o el estado de un método.
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
  return requestApi<MetodoPago>(`/pagos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

// DELETE: elimina un método por su identificador.
export async function eliminarMetodoPago(id: string) {
  if (await estaEnModoDemo()) {
    const metodos = await listarDemo();
    await guardarDemo(metodos.filter((metodo) => metodo.id !== id));
    return;
  }
  return requestApi<void>(`/pagos/${id}`, { method: 'DELETE' });
}
