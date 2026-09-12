import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/httpClient';
import { notificar } from './GlobalNotifications';

const API_AUTH_URL = `${API_BASE_URL}/api/auth`;

export const OlvidarContrasena: React.FC<{ onVolverAlLogin: () => void }> = ({ onVolverAlLogin }) => {
  const [paso, setPaso] = useState(1);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);

  const pedirCodigo = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setExito(''); setCargando(true);
    try {
      const { data } = await axios.post<{ dev_pin?: string }>(`${API_AUTH_URL}/forgot-password`, { email });
      notificar({ titulo: 'Recuperación de contraseña', mensaje: `Tu código es ${data.dev_pin ?? 'No disponible'}. Úsalo para continuar.`, tipo: 'success', duracionMs: 10000 });
      setExito('El código se mostró en la alerta superior derecha.');
      window.setTimeout(() => { setExito(''); setPaso(2); }, 1200);
    } catch (e: any) { setError(e?.response?.data?.detail || 'No se pudo generar el código.'); }
    finally { setCargando(false); }
  };

  const revisarCodigo = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setExito('');
    if (pin.length !== 6) return setError('El código debe tener 6 números.');
    setCargando(true);
    try {
      const { data } = await axios.post<{ reset_token: string }>(`${API_AUTH_URL}/verify-pin`, { email, pin });
      setToken(data.reset_token); setExito('Código correcto.');
      window.setTimeout(() => { setExito(''); setPaso(3); }, 700);
    } catch (e: any) { setError(e?.response?.data?.detail || 'El código no es válido o ya venció.'); }
    finally { setCargando(false); }
  };

  const guardarNueva = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (nueva !== confirmacion) return setError('Las contraseñas no coinciden.');
    if (nueva.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    setCargando(true);
    try { await axios.post(`${API_AUTH_URL}/reset-password`, { token, new_password: nueva }); setPaso(4); }
    catch (e: any) { setError(e?.response?.data?.detail || 'No se pudo cambiar la contraseña.'); }
    finally { setCargando(false); }
  };

  return <div style={styles.container}><div style={styles.card}>
    {paso < 4 && <div style={styles.stepper}><span style={paso >= 1 ? styles.stepActive : styles.step}>1. Correo</span><span style={styles.separator}>›</span><span style={paso >= 2 ? styles.stepActive : styles.step}>2. Código</span><span style={styles.separator}>›</span><span style={paso >= 3 ? styles.stepActive : styles.step}>3. Contraseña</span></div>}
    {error && <div style={styles.alertError}>{error}</div>}{exito && <div style={styles.alertSuccess}>{exito}</div>}
    {paso === 1 && <form onSubmit={pedirCodigo} style={styles.form}><h2 style={styles.title}>¿Olvidaste tu contraseña?</h2><p style={styles.subtitle}>Escribe tu correo registrado para generar un código de recuperación.</p><label style={styles.label}>Correo electrónico</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" style={styles.input} /><button disabled={cargando} style={styles.buttonPrimary}>{cargando ? 'Generando código...' : 'Generar código'}</button></form>}
    {paso === 2 && <form onSubmit={revisarCodigo} style={styles.form}><h2 style={styles.title}>Escribe el código</h2><p style={styles.subtitle}>Busca el código en la alerta superior derecha.</p><label style={styles.label}>Código de 6 números</label><input inputMode="numeric" maxLength={6} required value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="123456" style={{ ...styles.input, textAlign: 'center', letterSpacing: '8px', fontSize: '20px' }} /><button disabled={cargando} style={styles.buttonPrimary}>{cargando ? 'Revisando...' : 'Revisar código'}</button><button type="button" onClick={() => setPaso(1)} style={styles.buttonSecondary}>Cambiar correo</button></form>}
    {paso === 3 && <form onSubmit={guardarNueva} style={styles.form}><h2 style={styles.title}>Nueva contraseña</h2><p style={styles.subtitle}>Escribe y confirma tu nueva contraseña.</p><label style={styles.label}>Nueva contraseña</label><input type="password" required value={nueva} onChange={e => setNueva(e.target.value)} placeholder="••••••••" style={styles.input} /><label style={styles.label}>Repetir contraseña</label><input type="password" required value={confirmacion} onChange={e => setConfirmacion(e.target.value)} placeholder="••••••••" style={styles.input} /><button disabled={cargando || nueva !== confirmacion} style={{ ...styles.buttonPrimary, opacity: nueva && nueva === confirmacion ? 1 : 0.6 }}>{cargando ? 'Guardando...' : 'Cambiar contraseña'}</button></form>}
    {paso === 4 && <div style={styles.successView}><div style={styles.celebration}>✓</div><h2 style={styles.title}>Contraseña actualizada</h2><p style={styles.subtitle}>Ya puedes iniciar sesión con tu nueva contraseña.</p><button onClick={onVolverAlLogin} style={styles.buttonPrimary}>Volver al inicio de sesión</button></div>}
    {paso < 4 && <button onClick={onVolverAlLogin} style={styles.linkButton}>← Volver al inicio de sesión</button>}
  </div></div>;
};

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', width: '100%' }, card: { width: '100%', background: 'transparent' },
  stepper: { display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,.1)', fontSize: 11 }, step: { color: '#555' }, stepActive: { color: '#39a900', fontWeight: 700 }, separator: { color: '#555' },
  title: { fontSize: 18, color: '#fff', margin: '0 0 6px' }, subtitle: { color: '#aaa', fontSize: 13, lineHeight: 1.4, margin: '0 0 16px' }, form: { display: 'flex', flexDirection: 'column', gap: 8 }, label: { color: '#ddd', fontSize: 12, fontWeight: 600, marginTop: 4 },
  input: { padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', width: '100%' }, buttonPrimary: { background: '#39a900', color: '#fff', border: 0, padding: 12, borderRadius: 6, fontWeight: 700, cursor: 'pointer', marginTop: 8, fontSize: 14 }, buttonSecondary: { background: 'transparent', color: '#aaa', border: '1px solid rgba(255,255,255,.2)', padding: 8, borderRadius: 6, cursor: 'pointer', marginTop: 8, fontSize: 12 }, linkButton: { background: 'none', border: 0, color: '#39a900', cursor: 'pointer', fontSize: 13, textDecoration: 'underline', display: 'block', margin: '16px auto 0' },
  alertError: { background: 'rgba(231,76,60,.15)', color: '#e74c3c', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 14, border: '1px solid rgba(231,76,60,.3)' }, alertSuccess: { background: 'rgba(57,169,0,.15)', color: '#39a900', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 14, border: '1px solid rgba(57,169,0,.3)' }, successView: { textAlign: 'center' }, celebration: { fontSize: 40, color: '#39a900', marginBottom: 10 },
};
