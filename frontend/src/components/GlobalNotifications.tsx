import { useEffect, useRef, useState } from 'react';
import { listarNotificaciones, type Notificacion } from '../api/notificaciones.api';
import { useAuth } from '../context/AuthContext';

export type TipoNotificacion = 'success' | 'error' | 'warning' | 'info';
export interface NotificacionVisual {
  titulo: string;
  mensaje: string;
  tipo?: TipoNotificacion;
  duracionMs?: number;
}

export function notificar(notificacion: NotificacionVisual) {
  window.dispatchEvent(new CustomEvent<NotificacionVisual>('ev-charge:notificacion', { detail: notificacion }));
}

const iconoTipo = (tipo?: Notificacion['tipo'] | TipoNotificacion) => {
  if (tipo === 'reserva') return 'fa-calendar-check';
  if (tipo === 'pago' || tipo === 'compra') return 'fa-credit-card';
  if (tipo === 'reporte') return 'fa-triangle-exclamation';
  if (tipo === 'favorito') return 'fa-star';
  if (tipo === 'calificacion') return 'fa-star-half-stroke';
  if (tipo === 'vehiculo') return 'fa-car';
  if (tipo === 'error') return 'fa-circle-xmark';
  if (tipo === 'warning') return 'fa-triangle-exclamation';
  if (tipo === 'success') return 'fa-circle-check';
  return 'fa-bell';
};

export function GlobalNotifications() {
  const { usuario } = useAuth();
  const idsConocidos = useRef<Set<string>>(new Set());
  const primeraConsulta = useRef(true);
  const [notificacion, setNotificacion] = useState<Notificacion | null>(null);
  const [notificacionVisual, setNotificacionVisual] = useState<NotificacionVisual | null>(null);

  useEffect(() => {
    idsConocidos.current = new Set();
    primeraConsulta.current = true;
    setNotificacion(null);
    setNotificacionVisual(null);
    const recibirNotificacion = (evento: Event) => {
      const detalle = (evento as CustomEvent<NotificacionVisual>).detail;
      setNotificacion(null);
      setNotificacionVisual(detalle);
    };
    window.addEventListener('ev-charge:notificacion', recibirNotificacion);
    if (!usuario) return () => window.removeEventListener('ev-charge:notificacion', recibirNotificacion);
    let cancelado = false;
    const consultar = async () => {
      try {
        const lista = await listarNotificaciones();
        if (cancelado) return;
        if (primeraConsulta.current) {
          lista.forEach((item) => idsConocidos.current.add(item.id));
          primeraConsulta.current = false;
          return;
        }
        const nuevas = lista.filter((item) => !idsConocidos.current.has(item.id));
        lista.forEach((item) => idsConocidos.current.add(item.id));
        if (nuevas.length) setNotificacion(nuevas[0]);
      } catch {
        // No interrumpir la navegación si el historial no está disponible.
      }
    };
    void consultar();
    const intervalo = window.setInterval(() => void consultar(), 8000);
    return () => { cancelado = true; window.clearInterval(intervalo); window.removeEventListener('ev-charge:notificacion', recibirNotificacion); };
  }, [usuario]);

  useEffect(() => {
    if (!notificacion && !notificacionVisual) return;
    const temporizador = window.setTimeout(() => { setNotificacion(null); setNotificacionVisual(null); }, notificacionVisual?.duracionMs || 4000);
    return () => window.clearTimeout(temporizador);
  }, [notificacion, notificacionVisual]);

  if (!notificacion && !notificacionVisual) return null;
  const titulo = notificacionVisual?.titulo || notificacion?.titulo || '';
  const mensaje = notificacionVisual?.mensaje || notificacion?.mensaje || '';
  const tipo = notificacionVisual?.tipo;
  const icono = iconoTipo(notificacion?.tipo || tipo);
  const color = tipo === 'error' ? '#e74c3c' : tipo === 'warning' ? '#f39c12' : tipo === 'success' ? '#39a900' : notificacion?.tipo === 'reporte' ? '#f39c12' : notificacion?.tipo === 'pago' ? '#39a900' : '#3498db';
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000, width: 'min(360px, calc(100vw - 32px))', padding: '14px 42px 14px 16px', borderRadius: 10, border: `1px solid ${color}`, background: 'rgba(20, 20, 20, 0.96)', color: '#fff', boxShadow: '0 8px 28px rgba(0,0,0,.45)' }}>
      <button type="button" aria-label="Cerrar notificación" onClick={() => { setNotificacion(null); setNotificacionVisual(null); }} style={{ position: 'absolute', top: 8, right: 10, border: 0, background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: 18 }}>×</button>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${color}22`, color, flexShrink: 0 }}><i className={`fa-solid ${icono}`}></i></span>
        <span><strong style={{ display: 'block', color }}>{titulo}</strong><span style={{ display: 'block', marginTop: 5, fontSize: 13, lineHeight: 1.4 }}>{mensaje}</span></span>
      </div>
    </div>
  );
}
