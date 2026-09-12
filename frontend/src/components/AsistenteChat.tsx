import { useEffect, useRef, useState } from 'react';
import { preguntarAsistente, type MensajeAsistente } from '../api/asistente.api';
import { notificar } from './GlobalNotifications';

const SALUDO = 'Hola, soy el asistente de EV Charge. Puedes preguntarme libremente sobre la plataforma, movilidad eléctrica, estaciones, rutas, reservas o tu cuenta.';
const INICIALES = ['¿Qué cargador sirve para mi vehículo?', '¿Cómo hago una reserva?', '¿Por qué no puedo reservar?'];

export function AsistenteChat() {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [mensajes, setMensajes] = useState<MensajeAsistente[]>([{ role: 'assistant', content: SALUDO }]);
  const [sugerencias, setSugerencias] = useState(INICIALES);
  const ultimaActividad = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const mensajesRef = useRef<HTMLDivElement>(null);

  useEffect(() => { mensajesRef.current?.scrollTo({ top: mensajesRef.current.scrollHeight, behavior: 'smooth' }); }, [mensajes, cargando]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (abierto && Date.now() - ultimaActividad.current >= 120000) {
        setMensajes([{ role: 'assistant', content: 'El chat terminó por inactividad. Puedes volver a escribirme cuando quieras.' }]);
        setSugerencias(INICIALES); setPregunta(''); setAbierto(false);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [abierto]);

  const actividad = () => { ultimaActividad.current = Date.now(); };
  const enviar = async (texto = pregunta) => {
    const limpio = texto.trim();
    if (!limpio || limpio.length > 1000 || cargando) return;
    actividad(); setPregunta('');
    const historial = [...mensajes, { role: 'user' as const, content: limpio }];
    setMensajes(historial); setCargando(true);
    try {
      const inicio = Date.now();
      const data = await preguntarAsistente(limpio, mensajes.slice(-11));
      const espera = Math.max(0, 650 - (Date.now() - inicio));
      if (espera) await new Promise((resolve) => window.setTimeout(resolve, espera));
      setMensajes((actual) => [...actual, { role: 'assistant', content: data.respuesta }]);
      setSugerencias(data.sugerencias.length ? data.sugerencias : INICIALES);
    } catch (error: any) {
      const mensaje = error?.status === 429 ? 'Has realizado muchas consultas. Espera un momento y vuelve a intentarlo.' : 'No pude conectarme al asistente. Revisa que el backend esté activo e inténtalo de nuevo.';
      setMensajes((actual) => [...actual, { role: 'assistant', content: mensaje }]);
      notificar({ titulo: 'Asistente no disponible', mensaje, tipo: 'warning' });
    } finally { setCargando(false); }
  };

  return <>
    {!abierto && <button className="asistente-flotante" aria-label="Abrir asistente" onClick={() => { setAbierto(true); actividad(); window.setTimeout(() => inputRef.current?.focus(), 0); }}>🤖</button>}
    {abierto && <section className="asistente-panel" aria-label="Asistente EV Charge">
      <header><div><strong>Asistente EV Charge</strong><small>Conversa sobre lo que necesites</small></div><button aria-label="Cerrar asistente" onClick={() => setAbierto(false)}>×</button></header>
      <div className="asistente-mensajes" ref={mensajesRef}>{mensajes.map((item, index) => <div className={`asistente-mensaje ${item.role}`} key={`${item.role}-${index}`}>{item.content}</div>)}{cargando && <div className="asistente-mensaje assistant asistente-escribiendo" aria-label="El asistente está escribiendo"><i></i><i></i><i></i></div>}</div>
      {!cargando && <div className="asistente-sugerencias">{sugerencias.slice(0, 3).map((item) => <button key={item} onClick={() => void enviar(item)}>{item}</button>)}</div>}
      <form onSubmit={(event) => { event.preventDefault(); void enviar(); }}><input ref={inputRef} value={pregunta} maxLength={1000} onChange={(event) => { setPregunta(event.target.value); actividad(); }} placeholder="Escribe tu pregunta..." aria-label="Pregunta para el asistente" /><button disabled={!pregunta.trim() || cargando}>Enviar</button></form>
    </section>}
  </>;
}
