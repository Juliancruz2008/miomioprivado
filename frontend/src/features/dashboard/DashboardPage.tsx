import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/admin.css';
import '../../styles/dashboard_usuario.css';
import { useAuth } from '../../context/AuthContext';
import { listarVehiculos, crearVehiculo, actualizarVehiculo, eliminarVehiculo, type Vehiculo } from '../../api/vehiculos.api';
import { misReservas, crearReserva, crearReservaConfirmada, cancelarReserva, actualizarReserva, eliminarReserva, type Reserva, type ReservaCreate } from '../../api/reservas.api';
import { listarMetodosPago, type MetodoPago } from '../../api/metodosPago.api';
import { listarFavoritos, quitarFavorito, type Favorito } from '../../api/favoritos.api';
import { misReportes, crearReporte, actualizarReporte, eliminarReporte, type Reporte } from '../../api/reportes.api';
import { misCalificaciones, calificar, actualizarCalificacion, eliminarCalificacion, type Calificacion } from '../../api/calificaciones.api';
import { listarCargas, estadisticasCargas, type Carga, type CargasEstadisticas } from '../../api/cargas.api';
import { listarCompras, type Compra } from '../../api/compras.api';
import { actualizarPerfil, cambiarPassword } from '../../api/auth.api';
import { listarEstacionesBogota } from '../../api/mapa.api';
import { obtenerEstadoEstacion } from '../../api/estado.api';
import type { EstacionOCM } from '../mapa/types';
import { contieneLenguajeOfensivo, mensajeContenidoOfensivo } from '../../utils/contentFilter';
import { ModalPago } from '../../components/ModalPago';
import { notificar } from '../../components/GlobalNotifications';
import { MetodosPagoPanel } from '../dashboard-usuario/metodos-pago/MetodosPagoPanel';

type ThemeMode = 'dark' | 'light' | 'system';

const paneles = ['Inicio', 'Vehículos', 'Reservas', 'Pagos', 'Compras', 'Cargas', 'Favoritos', 'Reportes', 'Calificaciones', 'Mi perfil'];
type Panel = typeof paneles[number];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación';
}

function proximaHoraReserva() {
  const ahora = new Date();
  ahora.setMinutes(0, 0, 0);
  ahora.setHours(ahora.getHours() + 1);
  const pad = (numero: number) => String(numero).padStart(2, '0');
  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
}

function conectorCoincide(tipoCargador: string, tipoVehiculo: string) {
  const normalizar = (valor: string) => valor.toLowerCase().replace(/[\s\-_/()]+/g, '');
  const cargador = normalizar(tipoCargador);
  const vehiculo = normalizar(tipoVehiculo);
  return !vehiculo || cargador.includes(vehiculo) || vehiculo.includes(cargador);
}

function etiquetaEstadoEstacion(estado?: string) {
  if (estado === 'mantenimiento') return 'En mantenimiento';
  if (estado === 'inactiva') return 'Fuera de servicio';
  return 'Disponible';
}

function claseEstadoEstacion(estado?: string) {
  if (estado === 'mantenimiento') return 'status-maintenance';
  if (estado === 'inactiva') return 'status-out-of-service';
  return 'status-available';
}

function DashboardTable({ children }: { children: React.ReactNode }) {
  return <div className="table-wrap"><table><tbody>{children}</tbody></table></div>;
}

export function DashboardPage() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>('Inicio');
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [pagos, setPagos] = useState<MetodoPago[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [estadosFavoritos, setEstadosFavoritos] = useState<Record<string, string>>({});
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [estacionesMapa, setEstacionesMapa] = useState<EstacionOCM[]>([]);
  const [estadoReserva, setEstadoReserva] = useState<{ cargadores_reservados?: string[]; estado?: string } | null>(null);
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [estadisticas, setEstadisticas] = useState<CargasEstadisticas>({ total_cargas: 0, total_sesiones: 0, total_kwh: 0, total_costo: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarVehiculo, setMostrarVehiculo] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState<string | null>(null);
  const [mostrarReserva, setMostrarReserva] = useState(false);
  const [reservaPendientePago, setReservaPendientePago] = useState<ReservaCreate | null>(null);
  const [pagoReserva, setPagoReserva] = useState<{ id: string; monto: number } | null>(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [reporteEditando, setReporteEditando] = useState<string | null>(null);
  const [mostrarCalificacion, setMostrarCalificacion] = useState(false);
  const mostrarCalificar = mostrarCalificacion;
  const [calificacionEditando, setCalificacionEditando] = useState<string | null>(null);
  const [alertaAccion, setAlertaAccion] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [form, setForm] = useState({ marca: '', modelo: '', anio: '', autonomia_km: '', tipo_conector: 'CCS' });
  const [reservaEditando, setReservaEditando] = useState<string | null>(null);
  const [reservaForm, setReservaForm] = useState({ estacion_ocm_id: '', estacion_nombre: '', cargador_id: '', inicio: '', fin: '' });
  const [duracionReserva, setDuracionReserva] = useState(2);
  const [reporteForm, setReporteForm] = useState({ estacion_ocm_id: '', estacion_nombre: '', tipo: 'averia', descripcion: '' });
  const [calificacionForm, setCalificacionForm] = useState({ estacion_ocm_id: '', estacion_nombre: '', puntaje: '5', comentario: '' });
  const cargaActivaRef = useRef<Panel | null>(null);
  
  // Estado para el tema
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    () => (localStorage.getItem('ev_theme') as ThemeMode) || 'system'
  );

  // Efecto para aplicar el tema
  useEffect(() => {
    const root = document.documentElement;

    const aplicarTema = (mode: ThemeMode) => {
      let temaEfectivo = mode;
      if (mode === 'system') {
        temaEfectivo = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      root.setAttribute('data-theme', temaEfectivo);
      localStorage.setItem('ev_theme', mode);
    };

    aplicarTema(themeMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (themeMode === 'system') aplicarTema('system');
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themeMode]);

  const formatearFechaLocal = (value: string | Date) => {
    const fecha = typeof value === 'string' ? new Date(value) : value;
    const pad = (numero: number) => String(numero).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
  };

  const calcularFinReserva = (inicio: string, horas: number) => {
    if (!inicio) return '';
    return formatearFechaLocal(new Date(new Date(inicio).getTime() + horas * 60 * 60 * 1000));
  };

  const actualizarInicioReserva = (inicio: string) => {
    setReservaForm((actual) => ({ ...actual, inicio, fin: calcularFinReserva(inicio, duracionReserva) }));
  };

  const cargarDatos = async (panelActual: Panel = panel) => {
    if (cargaActivaRef.current === panelActual) return;
    cargaActivaRef.current = panelActual;
    setCargando(true);
    setError('');
    try {
      if (panelActual === 'Inicio') {
        const [v, r, p, f, c] = await Promise.all([listarVehiculos(), misReservas(), listarMetodosPago(), listarFavoritos(), listarCompras()]);
        setVehiculos(v); setReservas(r); setPagos(p); setFavoritos(f); setCompras(c);
        await cargarEstadosFavoritos(f);
      } else if (panelActual === 'Vehículos') {
        setVehiculos(await listarVehiculos());
      } else if (panelActual === 'Reservas') {
        setReservas(await misReservas());
      } else if (panelActual === 'Pagos') {
        setPagos(await listarMetodosPago());
      } else if (panelActual === 'Compras') {
        setCompras(await listarCompras());
      } else if (panelActual === 'Cargas') {
        const [cargasUsuario, statsCargas] = await Promise.all([listarCargas(), estadisticasCargas()]);
        setCargas(cargasUsuario); setEstadisticas(statsCargas);
      } else if (panelActual === 'Favoritos') {
        const favoritosActualizados = await listarFavoritos();
        setFavoritos(favoritosActualizados);
        await cargarEstadosFavoritos(favoritosActualizados);
      } else if (panelActual === 'Reportes') {
        setReportes(await misReportes());
      } else if (panelActual === 'Calificaciones') {
        setCalificaciones(await misCalificaciones());
      }
    } catch (e) { setError(errorMessage(e)); } finally {
      setCargando(false);
      if (cargaActivaRef.current === panelActual) cargaActivaRef.current = null;
    }
  };

  const cargarEstadosFavoritos = async (favoritosActuales: Favorito[]) => {
    const estados = await Promise.all(favoritosActuales.map(async (favorito) => {
      try {
        const estado = await obtenerEstadoEstacion(favorito.estacion_ocm_id);
        return [favorito.estacion_ocm_id, String(estado.estado || 'disponible')] as const;
      } catch {
        return [favorito.estacion_ocm_id, 'disponible'] as const;
      }
    }));
    setEstadosFavoritos(Object.fromEntries(estados));
  };

  useEffect(() => { void cargarDatos(panel); }, [panel]);

  useEffect(() => {
    if (!['Reservas', 'Reportes', 'Calificaciones'].includes(panel)) return;
    let cancelado = false;
    listarEstacionesBogota()
      .then((estacionesBogota) => { if (!cancelado) setEstacionesMapa(estacionesBogota); })
      .catch(() => { if (!cancelado) setEstacionesMapa([]); });
    return () => { cancelado = true; };
  }, [panel]);

  useEffect(() => {
    const estacionId = reservaForm.estacion_ocm_id;
    if (!estacionId) {
      setEstadoReserva(null);
      return;
    }
    let cancelado = false;
    obtenerEstadoEstacion(estacionId)
      .then((estado) => { if (!cancelado) setEstadoReserva(estado); })
      .catch(() => { if (!cancelado) setEstadoReserva(null); });
    return () => { cancelado = true; };
  }, [reservaForm.estacion_ocm_id]);

  const addVehiculo = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = { marca: form.marca, modelo: form.modelo, tipo_conector: form.tipo_conector, anio: form.anio ? Number(form.anio) : undefined, autonomia_km: form.autonomia_km ? Number(form.autonomia_km) : undefined };
      if (vehiculoEditando) await actualizarVehiculo(vehiculoEditando, payload); else await crearVehiculo(payload);
      setForm({ marca: '', modelo: '', anio: '', autonomia_km: '', tipo_conector: 'CCS' }); setMostrarVehiculo(false); await cargarDatos();
      setVehiculoEditando(null);
    } catch (e) { setError(errorMessage(e)); }
  };

  const addReserva = async (event: FormEvent) => {
    event.preventDefault();
    if (!reservaForm.estacion_ocm_id || !reservaForm.cargador_id || !reservaForm.inicio || !reservaForm.fin) {
      setAlertaAccion({ tipo: 'error', texto: 'Debes completar la estación y el horario de la reserva.' });
      return;
    }

    const inicio = new Date(reservaForm.inicio);
    const fin = new Date(reservaForm.fin);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || inicio >= fin) {
      setError('Revisa la estación y el rango de fechas de la reserva.');
      return;
    }

    if (inicio < new Date()) {
      setError('No se puede reservar en el pasado.');
      return;
    }

    try { await crearReserva({ estacion_ocm_id: reservaForm.estacion_ocm_id.trim(), cargador_id: reservaForm.cargador_id, estacion_nombre: reservaForm.estacion_nombre.trim(), fecha_hora_inicio: new Date(reservaForm.inicio).toISOString(), fecha_hora_fin: new Date(reservaForm.fin).toISOString() }); window.localStorage.setItem('ev-charge:estaciones-actualizadas', String(Date.now())); window.dispatchEvent(new Event('ev-charge:estaciones-actualizadas')); setReservaForm({ estacion_ocm_id: '', estacion_nombre: '', cargador_id: '', inicio: '', fin: '' }); setMostrarReserva(false); await cargarDatos(); } catch (e) { setError(errorMessage(e)); }
  };

  const editarReserva = (reserva: Reserva) => {
    const horas = Math.max(1, Math.round((new Date(reserva.fecha_hora_fin).getTime() - new Date(reserva.fecha_hora_inicio).getTime()) / 3600000));
    setDuracionReserva(Math.min(8, horas));
    setReservaEditando(reserva.id);
    setReservaForm({
      estacion_ocm_id: reserva.estacion_ocm_id,
      estacion_nombre: reserva.estacion_nombre || '',
      cargador_id: reserva.cargador_id || '',
      inicio: formatearFechaLocal(reserva.fecha_hora_inicio),
      fin: formatearFechaLocal(reserva.fecha_hora_fin),
    });
    setMostrarReserva(true);
  };

  const guardarReserva = async (event: FormEvent) => {
    event.preventDefault();
    if (!vehiculoActivoReserva) {
      setAlertaAccion({ tipo: 'error', texto: 'Activa un vehículo antes de realizar una reserva.' });
      return;
    }
    if (!reservaForm.estacion_ocm_id || !reservaForm.cargador_id || !reservaForm.inicio || !reservaForm.fin) {
      setAlertaAccion({ tipo: 'error', texto: 'Debes completar la estación y el horario de la reserva.' });
      return;
    }

    const inicio = new Date(reservaForm.inicio);
    const fin = new Date(reservaForm.fin);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || inicio >= fin) {
      setAlertaAccion({ tipo: 'error', texto: 'El horario de inicio debe ser anterior al de fin.' });
      return;
    }

    if (inicio < new Date()) {
      setAlertaAccion({ tipo: 'error', texto: 'No se puede actualizar una reserva en el pasado.' });
      return;
    }

    try {
      const payload = {
        estacion_ocm_id: reservaForm.estacion_ocm_id.trim(),
        cargador_id: reservaForm.cargador_id,
        estacion_nombre: reservaForm.estacion_nombre.trim(),
        fecha_hora_inicio: inicio.toISOString(),
        fecha_hora_fin: fin.toISOString(),
      };

      if (reservaEditando) {
        await actualizarReserva(reservaEditando, payload);
        setAlertaAccion({ tipo: 'success', texto: 'Reserva actualizada correctamente.' });
      } else {
        if (!pagos.length) setPagos(await listarMetodosPago());
        setReservaPendientePago(payload);
        setPagoReserva({ id: `RESERVA-${Date.now()}`, monto: Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 3600000)) * 5000 });
        return;
      }

      setReservaForm({ estacion_ocm_id: '', estacion_nombre: '', cargador_id: '', inicio: '', fin: '' });
      setReservaEditando(null);
      setMostrarReserva(false);
      await cargarDatos();
    } catch (e) {
      setAlertaAccion({ tipo: 'error', texto: errorMessage(e) });
    }
  };

  const editarReporte = (reporte: Reporte) => {
    setReporteEditando(reporte.id);
    setReporteForm({ estacion_ocm_id: reporte.estacion_ocm_id, estacion_nombre: reporte.estacion_nombre || '', tipo: reporte.tipo, descripcion: reporte.descripcion || '' });
    setMostrarReporte(true);
  };

  const guardarReporte = async (event: FormEvent) => {
    event.preventDefault();
    if (contieneLenguajeOfensivo(reporteForm.descripcion)) {
      setAlertaAccion({ tipo: 'error', texto: mensajeContenidoOfensivo });
      return;
    }
    if (!reporteForm.descripcion.trim()) {
      setAlertaAccion({ tipo: 'error', texto: 'La descripción del reporte es obligatoria.' });
      return;
    }
    try {
      if (reporteEditando) {
        await actualizarReporte(reporteEditando, { tipo: reporteForm.tipo, descripcion: reporteForm.descripcion.trim() });
        setAlertaAccion({ tipo: 'success', texto: 'Reporte actualizado correctamente.' });
      } else {
        await crearReporte({ ...reporteForm, estacion_ocm_id: reporteForm.estacion_ocm_id.trim(), estacion_nombre: reporteForm.estacion_nombre.trim(), descripcion: reporteForm.descripcion.trim() });
        setAlertaAccion({ tipo: 'success', texto: 'Reporte enviado correctamente.' });
      }
      setReporteForm({ estacion_ocm_id: '', estacion_nombre: '', tipo: 'averia', descripcion: '' });
      setReporteEditando(null);
      setMostrarReporte(false);
      await cargarDatos();
    } catch (e) {
      setAlertaAccion({ tipo: 'error', texto: errorMessage(e) });
    }
  };

  const cancelarReservaUsuario = async (reserva: Reserva) => {
    if (!window.confirm('¿Deseas cancelar esta reserva?')) return;
    try {
      await cancelarReserva(reserva.id);
      setAlertaAccion({ tipo: 'success', texto: 'Reserva cancelada correctamente.' });
      await cargarDatos();
    } catch (e) {
      setAlertaAccion({ tipo: 'error', texto: errorMessage(e) });
    }
  };

  const eliminarReservaUsuario = async (reserva: Reserva) => {
    if (!window.confirm('¿Deseas eliminar esta reserva?')) return;
    try {
      await eliminarReserva(reserva.id);
      setAlertaAccion({ tipo: 'success', texto: 'Reserva eliminada correctamente.' });
      await cargarDatos();
    } catch (e) {
      setAlertaAccion({ tipo: 'error', texto: errorMessage(e) });
    }
  };

  const addCalificacion = async (event: FormEvent) => {
    event.preventDefault();
    if (contieneLenguajeOfensivo(calificacionForm.comentario)) { notificar({ tipo: 'warning', titulo: 'Calificación', mensaje: mensajeContenidoOfensivo }); return; }
    if (!calificacionForm.estacion_ocm_id.trim()) { setError('El ID de la estación es obligatorio.'); return; }
    try { await calificar({ ...calificacionForm, estacion_ocm_id: calificacionForm.estacion_ocm_id.trim(), estacion_nombre: calificacionForm.estacion_nombre.trim(), puntaje: Number(calificacionForm.puntaje) }); setCalificacionForm({ estacion_ocm_id: '', estacion_nombre: '', puntaje: '5', comentario: '' }); setMostrarCalificacion(false); await cargarDatos(); } catch (e) { setError(errorMessage(e)); }
  };

  const editarCalificacion = (calificacion: Calificacion) => {
    setCalificacionEditando(calificacion.id);
    setCalificacionForm({ estacion_ocm_id: calificacion.estacion_ocm_id, estacion_nombre: calificacion.estacion_nombre || '', puntaje: String(calificacion.puntaje), comentario: calificacion.comentario || '' });
    setMostrarCalificacion(true);
  };

  const guardarCalificacion = async (event: FormEvent) => {
    event.preventDefault();
    if (contieneLenguajeOfensivo(calificacionForm.comentario)) { notificar({ tipo: 'warning', titulo: 'Calificación', mensaje: mensajeContenidoOfensivo }); return; }
    const puntaje = Number(calificacionForm.puntaje);
    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
      setAlertaAccion({ tipo: 'error', texto: 'La puntuación debe estar entre 1 y 5.' });
      return;
    }
    if (!calificacionForm.comentario.trim()) {
      setAlertaAccion({ tipo: 'error', texto: 'El comentario es obligatorio.' });
      return;
    }
    try {
      if (calificacionEditando) {
        await actualizarCalificacion(calificacionEditando, { puntaje, comentario: calificacionForm.comentario.trim() });
        setAlertaAccion({ tipo: 'success', texto: 'Calificación actualizada correctamente.' });
      } else {
        await calificar({ ...calificacionForm, estacion_ocm_id: calificacionForm.estacion_ocm_id.trim(), estacion_nombre: calificacionForm.estacion_nombre.trim(), puntaje, comentario: calificacionForm.comentario.trim() });
        setAlertaAccion({ tipo: 'success', texto: 'Calificación guardada correctamente.' });
      }
      setCalificacionForm({ estacion_ocm_id: '', estacion_nombre: '', puntaje: '5', comentario: '' });
      setCalificacionEditando(null);
      setMostrarCalificacion(false);
      await cargarDatos();
    } catch (e) {
      setAlertaAccion({ tipo: 'error', texto: errorMessage(e) });
    }
  };

  const remove = async (action: () => Promise<unknown>) => { if (!window.confirm('¿Confirmas esta acción?')) return; try { await action(); await cargarDatos(); } catch (e) { setError(errorMessage(e)); } };
  const eliminarFavoritoDashboard = async (favorito: Favorito) => {
    if (!window.confirm('¿Deseas quitar esta estación de tus favoritos?')) return;
    try {
      await quitarFavorito(favorito.estacion_ocm_id);
      notificar({ tipo: 'success', titulo: 'Favorito eliminado', mensaje: `${favorito.estacion_nombre || 'La estación'} se quitó de tus favoritos.` });
      await cargarDatos();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const editarVehiculo = (vehiculo: Vehiculo) => { setVehiculoEditando(vehiculo.id); setForm({ marca: vehiculo.marca, modelo: vehiculo.modelo, anio: vehiculo.anio?.toString() || '', autonomia_km: vehiculo.autonomia_km?.toString() || '', tipo_conector: vehiculo.tipo_conector }); setMostrarVehiculo(true); };
  const activarVehiculo = async (vehiculo: Vehiculo) => { try { await actualizarVehiculo(vehiculo.id, { activo: true }); await cargarDatos(); } catch (e) { setError(errorMessage(e)); } };
  const cerrarSesion = () => { logout(); navigate('/'); };
  const title = panel === 'Mi perfil' ? 'Mi perfil' : panel;
  const vehiculoActivoReserva = vehiculos.find((vehiculo) => vehiculo.activo);
  const estacionSeleccionadaReserva = estacionesMapa.find((estacion) => String(estacion.ID) === reservaForm.estacion_ocm_id);
  const cargadoresReserva = (estacionSeleccionadaReserva?.Connections || []).map((conexion, indice) => ({
    conexion,
    indice,
    id: `${reservaForm.estacion_ocm_id}-${indice + 1}`,
    compatible: !vehiculoActivoReserva || conectorCoincide(conexion.ConnectionType?.Title || '', vehiculoActivoReserva.tipo_conector),
    reservado: Boolean(estadoReserva?.cargadores_reservados?.includes(`${reservaForm.estacion_ocm_id}-${indice + 1}`)),
  }));
  const cargadoresCompatiblesReserva = cargadoresReserva.filter((cargador) => cargador.compatible && !cargador.reservado);
  const estacionNoDisponible = estadoReserva?.estado === 'mantenimiento' || estadoReserva?.estado === 'inactiva';

  return <div className="dashboard-shell">
    <aside id="admin-sidebar">
      <Link className="admin-brand" to="/" aria-label="Ir al inicio de EV Charge"><img src="/img/logo.png" alt="EV Charge" /><span>EV Charge</span></Link>
      <div className="admin-user-info-sidebar"><strong>{usuario?.nombre} {usuario?.apellido}</strong><small>{usuario?.email}</small></div>
      <nav className="admin-nav">{paneles.map((item) => <button key={item} className={`anav${panel === item ? ' active' : ''}`} onClick={() => setPanel(item)}>{item}</button>)}</nav>
      <div className="admin-nav-bottom"><Link className="anav" to="/mapa">Abrir mapa</Link><button className="anav danger" onClick={cerrarSesion}>Cerrar sesión</button></div>
    </aside>
    <main id="admin-content">
      <header id="admin-header"><div><h1>{title}</h1><p>{panel === 'Inicio' ? 'Bienvenido a tu dashboard' : 'Gestiona tu información de EV Charge'}</p></div><Link className="btn-form" to="/mapa">Mapa</Link></header>
      <section className="panel active">
        {alertaAccion && <div className={`alert ${alertaAccion.tipo === 'success' ? 'alert-success' : 'alert-error'}`}>{alertaAccion.texto}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {cargando ? <p className="empty">Cargando información...</p> : <>
          {panel === 'Inicio' && <><div className="kpi-grid"><div className="kpi-card"><div className="kpi-icon">Vehículos</div><div className="kpi-num">{vehiculos.length}</div></div><div className="kpi-card"><div className="kpi-icon">Reservas</div><div className="kpi-num">{reservas.filter((r) => r.estado !== 'cancelada').length}</div></div><div className="kpi-card"><div className="kpi-icon">Pagos</div><div className="kpi-num">{pagos.length}</div></div><div className="kpi-card"><div className="kpi-icon">Compras</div><div className="kpi-num">{compras.length}</div></div><div className="kpi-card"><div className="kpi-icon">Favoritos</div><div className="kpi-num">{favoritos.length}</div></div></div><div className="activity-box"><div className="box-title">Actividad reciente</div>{reservas.length ? reservas.slice(0, 5).map((r) => <div className="res-row" key={r.id}><span>{r.estacion_nombre || r.estacion_ocm_id}</span><span className="res-fecha">{new Date(r.fecha_hora_inicio).toLocaleString()}</span></div>) : <p className="empty">Todavía no tienes reservas.</p>}</div></>}
          {panel === 'Vehículos' && <><div className="panel-toolbar"><button className="pill" onClick={() => { setVehiculoEditando(null); setMostrarVehiculo((value) => !value); }}>{mostrarVehiculo ? 'Cerrar' : '+ Agregar vehículo'}</button></div>{mostrarVehiculo && <form className="admin-form-grid" onSubmit={addVehiculo}><h3 className="full-width">{vehiculoEditando ? 'Editar vehículo' : 'Nuevo vehículo'}</h3><label>Marca<input required value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></label><label>Modelo<input required value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></label><label>Año<input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} /></label><label>Autonomía (km)<input type="number" value={form.autonomia_km} onChange={(e) => setForm({ ...form, autonomia_km: e.target.value })} /></label><label>Conector<select value={form.tipo_conector} onChange={(e) => setForm({ ...form, tipo_conector: e.target.value })}><option>CCS</option><option>Type 2</option><option>CHAdeMO</option><option>GB/T</option><option>J1772</option></select></label><button className="btn-form" type="submit">Guardar</button></form>}<DashboardTable>{vehiculos.map((v) => <tr key={v.id}><td><strong>{v.marca} {v.modelo}</strong><br /><small>{v.tipo_conector} {v.autonomia_km ? `· ${v.autonomia_km} km` : ''}</small></td><td><span className={`dashboard-status-badge ${v.activo ? 'status-active' : 'status-inactive'}`}>{v.activo ? 'Activo' : 'Inactivo'}</span> {!v.activo && <button className="btn-tbl" onClick={() => void activarVehiculo(v)}>Activar</button>} <button className="btn-tbl" onClick={() => editarVehiculo(v)}>Editar</button> <button className="btn-tbl danger" onClick={() => void remove(() => eliminarVehiculo(v.id))}>Eliminar</button></td></tr>)}{!vehiculos.length && <tr><td className="empty">No tienes vehículos registrados.</td></tr>}</DashboardTable></>}
          {panel === 'Reservas' && <><div className="activity-box reservation-history-intro"><div className="box-title">Historial de reservas</div><p className="panel-description">Consulta aquí tus reservas y su estado. Para crear una nueva reserva, utiliza el mapa.</p></div></>}
          {panel === 'Reservas' && false && <>
            <div className="panel-toolbar"><button className="pill" onClick={() => { setReservaEditando(null); setDuracionReserva(2); const inicio = proximaHoraReserva(); setReservaForm({ estacion_ocm_id: '', estacion_nombre: '', cargador_id: '', inicio, fin: calcularFinReserva(inicio, 2) }); setMostrarReserva((value) => !value); }}>{mostrarReserva ? 'Cerrar formulario' : '+ Nueva reserva'}</button></div>
            {mostrarReserva && <form className="admin-form-grid" onSubmit={guardarReserva}>
              {!vehiculoActivoReserva && <p className="panel-description full-width">Activa un vehículo en el apartado Vehículos para mostrar únicamente sus cargadores compatibles.</p>}
              <label>Estación<select required value={reservaForm.estacion_ocm_id} onChange={(e) => { const estacion = estacionesMapa.find((item) => String(item.ID) === e.target.value); const compatibles = (estacion?.Connections || []).map((conexion, indice) => ({ conexion, indice })).filter(({ conexion }) => !vehiculoActivoReserva || conectorCoincide(conexion.ConnectionType?.Title || '', vehiculoActivoReserva.tipo_conector)); const primero = compatibles[0]; const inicio = reservaForm.inicio || proximaHoraReserva(); setReservaForm({ ...reservaForm, estacion_ocm_id: e.target.value, estacion_nombre: estacion?.AddressInfo?.Title || '', cargador_id: primero ? `${e.target.value}-${primero.indice + 1}` : '', inicio, fin: calcularFinReserva(inicio, duracionReserva) }); }}><option value="">Selecciona una estación</option>{estacionesMapa.map((estacion) => <option key={String(estacion.ID)} value={String(estacion.ID)}>{estacion.AddressInfo?.Title || `Estación ${estacion.ID}`}</option>)}</select>{estacionSeleccionadaReserva && <span className={`dashboard-status-badge station-status-badge ${claseEstadoEstacion(estadoReserva?.estado)}`}><span aria-hidden="true">●</span> {etiquetaEstadoEstacion(estadoReserva?.estado)}</span>}</label>
              <label>Cargador<select required value={reservaForm.cargador_id} onChange={(e) => setReservaForm({ ...reservaForm, cargador_id: e.target.value })}><option value="">Selecciona un cargador compatible</option>{cargadoresReserva.map(({ conexion, id, compatible, reservado }) => <option key={id} value={id} disabled={estacionNoDisponible || !compatible || reservado}>{conexion.ConnectionType?.Title || 'Genérico'} · {conexion.PowerKW || '—'} kW · ID {id}{estacionNoDisponible ? ' · No disponible' : reservado ? ' · Reservado' : !compatible ? ' · No compatible' : ' · Disponible'}</option>)}</select>{reservaForm.cargador_id && <span className={`dashboard-status-badge charger-status-badge ${estacionNoDisponible || cargadoresReserva.find((cargador) => cargador.id === reservaForm.cargador_id)?.reservado ? 'status-inactive' : 'status-active'}`}><span aria-hidden="true">●</span> {estacionNoDisponible ? 'No disponible' : cargadoresReserva.find((cargador) => cargador.id === reservaForm.cargador_id)?.reservado ? 'Reservado' : 'Disponible'}</span>}{estacionSeleccionadaReserva && !cargadoresCompatiblesReserva.length && !estacionNoDisponible && <small className="form-help">Esta estación no tiene cargadores compatibles y disponibles para tu vehículo activo.</small>}{vehiculoActivoReserva && cargadoresCompatiblesReserva.length > 0 && !estacionNoDisponible && <small className="form-help">Compatible y disponible para {vehiculoActivoReserva?.marca} {vehiculoActivoReserva?.modelo} · {vehiculoActivoReserva?.tipo_conector}</small>}</label>
              <label className="full-width">Duración<div className="duracion-control dashboard-duration"><input type="range" min={1} max={8} step={1} value={duracionReserva} onChange={(e) => { const horas = Number(e.target.value); setDuracionReserva(horas); setReservaForm((actual) => ({ ...actual, fin: calcularFinReserva(actual.inicio, horas) })); }} /><strong>{duracionReserva} h</strong></div></label>
              <label>Inicio<div className="dashboard-time-row"><input required type="datetime-local" value={reservaForm.inicio} min={formatearFechaLocal(new Date())} onChange={(e) => actualizarInicioReserva(e.target.value)} /><button type="button" className="btn-now" onClick={() => actualizarInicioReserva(proximaHoraReserva())}>Ahora</button></div></label>
              <label>Fin<input required type="datetime-local" readOnly value={reservaForm.fin} min={reservaForm.inicio || formatearFechaLocal(new Date())} /></label>
              {estacionNoDisponible && <p className="form-help full-width">Esta estación está {estadoReserva?.estado === 'mantenimiento' ? 'en mantenimiento' : 'fuera de servicio'} y no admite reservas.</p>}
              <button className="btn-form" type="submit" disabled={estacionNoDisponible || !vehiculoActivoReserva || !reservaForm.cargador_id || !cargadoresCompatiblesReserva.some((cargador) => cargador.id === reservaForm.cargador_id)}>{reservaEditando ? 'Guardar cambios' : 'Continuar al pago'}</button>
            </form>}
            <DashboardTable>{reservas.map((r) => <tr key={r.id}><td><strong>{r.estacion_nombre || r.estacion_ocm_id}</strong><br /><small>Cargador: {r.cargador_id || 'General'}</small><br /><small>Inicio: {new Date(r.fecha_hora_inicio).toLocaleString()}</small><br /><small>Fin: {new Date(r.fecha_hora_fin).toLocaleString()}</small><br /><small className={`badge-estado ${r.estado === 'activa' ? 'activa' : r.estado === 'rechazada' || r.estado === 'cancelada' ? 'cancelada' : ''}`}>{r.estado === 'activa' ? 'Aceptada' : r.estado}</small></td><td>{r.estado === 'pendiente' && <button className="btn-tbl" onClick={() => editarReserva(r)}>Editar</button>} {(r.estado === 'pendiente' || r.estado === 'activa') && <button className="btn-tbl danger" onClick={() => void cancelarReservaUsuario(r)}>Cancelar</button>} {r.estado === 'realizada' && <button className="btn-tbl danger" onClick={() => void eliminarReservaUsuario(r)}>Eliminar</button>}</td></tr>)}{!reservas.length && <tr><td className="empty">No tienes reservas.</td></tr>}</DashboardTable>
          </>}
          {panel === 'Pagos' && <MetodosPagoPanel metodos={pagos} onMetodosChange={setPagos} />}
          {panel === 'Compras' && <><div className="activity-box"><div className="box-title">Compras realizadas</div><p className="panel-description">Aquí encontrarás los productos adquiridos mediante el pago simulado de EV Charge.</p></div><DashboardTable>{compras.map((compra) => <tr key={compra.id}><td><strong>{compra.producto}</strong><br /><small>{new Date(compra.created_at).toLocaleString('es-CO')}</small></td><td><strong>${Number(compra.monto).toLocaleString('es-CO')} COP</strong><br /><small>Pago: {compra.metodo}</small></td><td><span className="badge-estado activa">Compra aprobada</span><br /><small>{compra.transaccion_id}</small></td></tr>)}{!compras.length && <tr><td className="empty" colSpan={3}>Todavía no tienes compras realizadas.</td></tr>}</DashboardTable></>}
          {panel === 'Cargas' && <><div className="kpi-grid"><div className="kpi-card"><div className="kpi-icon">Sesiones validadas</div><div className="kpi-num">{estadisticas.total_cargas}</div></div><div className="kpi-card"><div className="kpi-icon">Energía validada</div><div className="kpi-num">{estadisticas.total_kwh} kWh</div></div><div className="kpi-card"><div className="kpi-icon">Costo validado</div><div className="kpi-num">${Number(estadisticas.total_costo).toLocaleString('es-CO')} COP</div></div></div><DashboardTable>{cargas.map((carga) => <tr key={carga.id}><td><strong>{carga.estacion_nombre || carga.estacion_ocm_id}</strong><br /><small>{carga.fecha ? new Date(carga.fecha).toLocaleString('es-CO') : 'Sin fecha'}</small></td><td><strong>{carga.kwh_cargados} kWh</strong><br /><small>${Number(carga.costo_estimado).toLocaleString('es-CO')} COP</small></td><td><span className={`badge-estado ${carga.estado === 'validada' ? 'activa' : carga.estado === 'rechazada' ? 'cancelada' : ''}`}>{carga.estado}</span></td></tr>)}{!cargas.length && <tr><td className="empty" colSpan={3}>Todavía no tienes cargas registradas.</td></tr>}</DashboardTable></>}
          {panel === 'Favoritos' && <DashboardTable>{favoritos.map((f) => { const estado = estadosFavoritos[f.estacion_ocm_id] || 'disponible'; return <tr key={f.id}><td><strong>{f.estacion_nombre || 'Estación guardada'}</strong><br /><small>ID de estación: {f.estacion_ocm_id}</small><br /><span className={`badge-estado ${estado === 'disponible' ? 'activa' : estado === 'reservada' ? 'reservada' : estado === 'mantenimiento' ? 'pendiente' : 'cancelada'}`}>Estado: {estado.replace('_', ' ')}</span></td><td><Link className="btn-tbl" to={`/mapa?estacion=${encodeURIComponent(f.estacion_ocm_id)}`}>Ver en mapa</Link> <button className="btn-tbl danger" onClick={() => void eliminarFavoritoDashboard(f)}>Quitar</button></td></tr>; })}{!favoritos.length && <tr><td className="empty" colSpan={2}>No tienes estaciones favoritas.</td></tr>}</DashboardTable>}
          {panel === 'Reportes' && <><div className="panel-toolbar"><button className="pill" onClick={() => { setReporteEditando(null); setReporteForm({ estacion_ocm_id: '', estacion_nombre: '', tipo: 'averia', descripcion: '' }); setMostrarReporte((value) => !value); }}>{mostrarReporte ? 'Cerrar formulario' : '+ Nuevo reporte'}</button></div>{mostrarReporte && <form className="admin-form-grid" onSubmit={guardarReporte}><label>Estación<select required disabled={Boolean(reporteEditando)} value={reporteForm.estacion_ocm_id} onChange={(e) => { const estacion = estacionesMapa.find((item) => String(item.ID) === e.target.value); setReporteForm({ ...reporteForm, estacion_ocm_id: e.target.value, estacion_nombre: estacion?.AddressInfo?.Title || '' }); }}><option value="">Selecciona una estación</option>{estacionesMapa.map((estacion) => <option key={String(estacion.ID)} value={String(estacion.ID)}>{estacion.AddressInfo?.Title || `Estación ${estacion.ID}`}</option>)}</select></label><label>Nombre de estación<input disabled value={reporteForm.estacion_nombre} readOnly /></label><label>Tipo<select value={reporteForm.tipo} onChange={(e) => setReporteForm({ ...reporteForm, tipo: e.target.value })}><option value="averia">Avería</option><option value="fuera_servicio">Fuera de servicio</option><option value="ocupado">Ocupado</option><option value="otro">Otro</option></select></label><label className="full-width">Descripción<textarea required value={reporteForm.descripcion} onChange={(e) => setReporteForm({ ...reporteForm, descripcion: e.target.value })} /></label><button className="btn-form" type="submit">{reporteEditando ? 'Guardar cambios' : 'Enviar reporte'}</button></form>}<DashboardTable>{reportes.map((r) => <tr key={r.id}><td><strong>{r.estacion_nombre || r.estacion_ocm_id}</strong><br /><small>Tipo: {r.tipo}</small><br /><small>Descripción: {r.descripcion || 'Sin descripción'}</small><br /><span className={`dashboard-status-badge report-status-badge ${r.estado === 'resuelto' ? 'status-active' : 'status-inactive'}`}><span aria-hidden="true">●</span> Estado: {r.estado || 'abierto'}</span><br /><small>Fecha: {r.fecha ? new Date(r.fecha).toLocaleString() : 'Sin fecha'}</small></td><td>{r.estado === 'abierto' && <button className="btn-tbl" onClick={() => editarReporte(r)}>Editar</button>} {r.estado === 'abierto' && <button className="btn-tbl danger" onClick={() => void remove(() => eliminarReporte(r.id))}>Eliminar</button>}</td></tr>)}{!reportes.length && <tr><td className="empty">No tienes reportes.</td></tr>}</DashboardTable></>}
          {panel === 'Calificaciones' && <><div className="panel-toolbar"><button className="pill" onClick={() => { setCalificacionEditando(null); setCalificacionForm({ estacion_ocm_id: '', estacion_nombre: '', puntaje: '5', comentario: '' }); setMostrarCalificacion((value) => !value); }}>{mostrarCalificar ? 'Cerrar formulario' : '+ Nueva calificación'}</button></div>{mostrarCalificacion && <form className="admin-form-grid" onSubmit={guardarCalificacion}><label>Estación<select required disabled={Boolean(calificacionEditando)} value={calificacionForm.estacion_ocm_id} onChange={(e) => { const estacion = estacionesMapa.find((item) => String(item.ID) === e.target.value); setCalificacionForm({ ...calificacionForm, estacion_ocm_id: e.target.value, estacion_nombre: estacion?.AddressInfo?.Title || '' }); }}><option value="">Selecciona una estación</option>{estacionesMapa.map((estacion) => <option key={String(estacion.ID)} value={String(estacion.ID)}>{estacion.AddressInfo?.Title || `Estación ${estacion.ID}`}</option>)}</select></label><label>Nombre de estación<input disabled value={calificacionForm.estacion_nombre} readOnly /></label><label>Puntaje<select value={calificacionForm.puntaje} onChange={(e) => setCalificacionForm({ ...calificacionForm, puntaje: e.target.value })}><option value="5">5 - Excelente</option><option value="4">4 - Muy buena</option><option value="3">3 - Buena</option><option value="2">2 - Regular</option><option value="1">1 - Mala</option></select></label><label className="full-width">Comentario<textarea required value={calificacionForm.comentario} onChange={(e) => setCalificacionForm({ ...calificacionForm, comentario: e.target.value })} /></label><button className="btn-form" type="submit">{calificacionEditando ? 'Guardar cambios' : 'Guardar calificación'}</button></form>}<DashboardTable>{calificaciones.map((c) => <tr key={c.id}><td><strong>{c.estacion_nombre || c.estacion_ocm_id}</strong><br /><span className="dashboard-rating-stars" aria-label={`${c.puntaje} de 5 estrellas`}>{'★'.repeat(c.puntaje)}<span>{'☆'.repeat(5 - c.puntaje)}</span></span><br /><small>{c.comentario || 'Sin comentario'}</small><br /><small>Publicada: {c.fecha ? new Date(c.fecha).toLocaleString('es-CO') : 'Sin fecha'}</small></td><td><button className="btn-tbl" onClick={() => editarCalificacion(c)}>Editar</button> <button className="btn-tbl danger" onClick={() => void remove(() => eliminarCalificacion(c.id))}>Eliminar</button></td></tr>)}{!calificaciones.length && <tr><td className="empty">No tienes calificaciones.</td></tr>}</DashboardTable></>}
          {panel === 'Mi perfil' && <ProfileForm />}
        </>}
      </section>
    </main>
    <div className="theme-floating-widget">
      <button className={`theme-btn ${themeMode === 'dark' ? 'active' : ''}`} onClick={() => setThemeMode('dark')} title="Modo Oscuro">
        <i className="fa-solid fa-moon"></i>
      </button>
      <button className={`theme-btn ${themeMode === 'light' ? 'active' : ''}`} onClick={() => setThemeMode('light')} title="Modo Claro">
        <i className="fa-solid fa-sun"></i>
      </button>
      <button className={`theme-btn ${themeMode === 'system' ? 'active' : ''}`} onClick={() => setThemeMode('system')} title="Tema del Sistema">
        <i className="fa-solid fa-circle-half-stroke"></i>
      </button>
    </div>
    {pagoReserva && <ModalPago tipo="reserva" tituloItem={reservaPendientePago?.estacion_nombre || 'Estación EV Charge'} monto={pagoReserva.monto} idReferencia={pagoReserva.id} metodosGuardados={pagos} onCerrar={() => { setPagoReserva(null); setReservaPendientePago(null); }} onExito={async () => { if (!reservaPendientePago) return; try { await crearReservaConfirmada(reservaPendientePago); setAlertaAccion({ tipo: 'success', texto: 'Pago aprobado y reserva aceptada correctamente.' }); window.localStorage.setItem('ev-charge:estaciones-actualizadas', String(Date.now())); window.dispatchEvent(new Event('ev-charge:estaciones-actualizadas')); setReservaForm({ estacion_ocm_id: '', estacion_nombre: '', cargador_id: '', inicio: '', fin: '' }); setMostrarReserva(false); await cargarDatos(); } catch (e) { setAlertaAccion({ tipo: 'error', texto: errorMessage(e) }); } finally { setPagoReserva(null); setReservaPendientePago(null); } }} />}
    <DashboardFooter />
  </div>;
}

function DashboardFooter() {
  return <footer className="footer"><div className="footer-inner"><div className="footer-brand"><img src="/img/logo.png" alt="EV Charge" className="footer-logo" /><p>Plataforma para localizar y gestionar estaciones de carga para vehículos eléctricos en Colombia.</p></div><div className="footer-links"><p className="footer-title">Navegación</p><Link to="/">Inicio</Link><Link to="/mapa">Mapa</Link></div><div className="footer-links"><p className="footer-title">Soporte</p><a href="mailto:contacto@evcharge.co">contacto@evcharge.co</a><span>Bogotá D.C., Colombia</span></div><div className="footer-links"><p className="footer-title">Información</p><span>Proyecto académico SENA ADSO</span><span>Versión 2.0</span></div></div><div className="footer-bottom"><p>© {new Date().getFullYear()} EV Charge · Todos los derechos reservados.</p></div></footer>;
}

function ProfileForm() {
  const { usuario, actualizarUsuario, logout: contextLogout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: usuario?.nombre || '', apellido: usuario?.apellido || '', email: usuario?.email || '' });
  const [formErrors, setFormErrors] = useState({ nombre: '', apellido: '', email: '' });
  const [passwords, setPasswords] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [passwordErrors, setPasswordErrors] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [mostrarPassword, setMostrarPassword] = useState({ actual: false, nueva: false, confirmacion: false });
  const [mensaje, setMensaje] = useState('');
  const [mensajePassword, setMensajePassword] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error'>('exito');
  const [tipoMensajePassword, setTipoMensajePassword] = useState<'exito' | 'error'>('exito');
  const [cargando, setCargando] = useState(false);
  const [cargandoPassword, setCargandoPassword] = useState(false);

  // Validar email con formato correcto
  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Validar requisitos de contraseña
  const validarRequisitosPassword = (password: string) => {
    return {
      minLongitud: password.length >= 8,
      tieneMayuscula: /[A-Z]/.test(password),
      tieneMinuscula: /[a-z]/.test(password),
      tieneNumero: /\d/.test(password),
      tieneEspecial: /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password),
    };
  };

  const requisitosActuales = validarRequisitosPassword(passwords.nueva);
  const totalRequisitos = Object.values(requisitosActuales).filter(Boolean).length;
  const todosRequisitos = Object.values(requisitosActuales).every(Boolean);

  // Mostrar mensaje con auto-desaparición
  const mostrarNotificacion = (msg: string, tipo: 'exito' | 'error', esPassword: boolean = false) => {
    if (esPassword) {
      setMensajePassword(msg);
      setTipoMensajePassword(tipo);
      setTimeout(() => setMensajePassword(''), 5000);
    } else {
      setMensaje(msg);
      setTipoMensaje(tipo);
      setTimeout(() => setMensaje(''), 5000);
    }
  };

  // Guardar perfil
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setFormErrors({ nombre: '', apellido: '', email: '' });
    setCargando(true);

    // Validaciones
    const errors = { nombre: '', apellido: '', email: '' };
    
    if (!form.nombre.trim()) {
      errors.nombre = 'Rellena este campo';
    }
    
    if (!form.apellido.trim()) {
      errors.apellido = 'Rellena este campo';
    }
    
    if (!form.email.trim()) {
      errors.email = 'Rellena este campo';
    } else if (!validarEmail(form.email)) {
      errors.email = 'El correo debe tener un formato válido (ejemplo@correo.com)';
    }

    if (errors.nombre || errors.apellido || errors.email) {
      setFormErrors(errors);
      setCargando(false);
      mostrarNotificacion('Por favor, completa todos los campos correctamente', 'error');
      return;
    }

    try {
      const respuesta = await actualizarPerfil({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
      });
      actualizarUsuario(respuesta.usuario);
      setForm({ nombre: form.nombre.trim(), apellido: form.apellido.trim(), email: form.email.trim() });
      mostrarNotificacion('Perfil actualizado', 'exito');
    } catch (e) {
      const errorMsg = errorMessage(e);
      if (errorMsg.includes('correo')) {
        setFormErrors({ ...errors, email: 'Este correo ya está registrado por otro usuario' });
        mostrarNotificacion('El correo ya está registrado', 'error');
      } else {
        mostrarNotificacion(errorMsg, 'error');
      }
    } finally {
      setCargando(false);
    }
  };

  // Cambiar contraseña
  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordErrors({ actual: '', nueva: '', confirmacion: '' });
    setCargandoPassword(true);

    // Validaciones
    const errors = { actual: '', nueva: '', confirmacion: '' };

    if (!passwords.actual.trim()) {
      errors.actual = 'Rellena este campo';
    }

    if (!passwords.nueva.trim()) {
      errors.nueva = 'Rellena este campo';
    } else if (passwords.nueva.length < 8) {
      errors.nueva = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!passwords.confirmacion.trim()) {
      errors.confirmacion = 'Rellena este campo';
    } else if (passwords.nueva !== passwords.confirmacion) {
      errors.confirmacion = 'Las contraseñas no coinciden';
    }

    if (errors.actual || errors.nueva || errors.confirmacion) {
      setPasswordErrors(errors);
      setCargandoPassword(false);
      mostrarNotificacion('Por favor, completa todos los campos correctamente', 'error', true);
      return;
    }

    try {
      await cambiarPassword(passwords.actual, passwords.nueva);
      setPasswords({ actual: '', nueva: '', confirmacion: '' });
      mostrarNotificacion(' Contraseña actualizada correctamente', 'exito', true);
    } catch (e) {
      const errorMsg = errorMessage(e);
      if (errorMsg.includes('incorrecta') || errorMsg.includes('incorrectas')) {
        setPasswordErrors({ ...errors, actual: 'Contraseña incorrecta' });
        mostrarNotificacion('Contraseña incorrecta', 'error', true);
      } else {
        mostrarNotificacion(errorMsg, 'error', true);
      }
    } finally {
      setCargandoPassword(false);
    }
  };

  return (
    <div className="profile-forms">
      {/* FORMULARIO DE DATOS PERSONALES */}
      <form className="admin-form-grid" onSubmit={save}>
        <h3 className="full-width">Datos personales</h3>
        
        <label>
          Nombre
          <input
            type="text"
            required
            value={form.nombre}
            onChange={(e) => {
              setForm({ ...form, nombre: e.target.value });
              setFormErrors({ ...formErrors, nombre: '' });
            }}
            className={formErrors.nombre ? 'input-error' : ''}
          />
          {formErrors.nombre && <small className="error-text">{formErrors.nombre}</small>}
        </label>

        <label>
          Apellido
          <input
            type="text"
            required
            value={form.apellido}
            onChange={(e) => {
              setForm({ ...form, apellido: e.target.value });
              setFormErrors({ ...formErrors, apellido: '' });
            }}
            className={formErrors.apellido ? 'input-error' : ''}
          />
          {formErrors.apellido && <small className="error-text">{formErrors.apellido}</small>}
        </label>

        <label className="full-width">
          Correo
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              setFormErrors({ ...formErrors, email: '' });
            }}
            className={formErrors.email ? 'input-error' : ''}
          />
          {formErrors.email && <small className="error-text">{formErrors.email}</small>}
        </label>

        <button className="btn-form" type="submit" disabled={cargando}>
          {cargando ? 'Guardando...' : 'Guardar cambios'}
        </button>

        {mensaje && (
          <p className={`form-message full-width ${tipoMensaje === 'exito' ? 'success' : 'error'}`}>
            {mensaje}
          </p>
        )}
      </form>

      {/* FORMULARIO DE CAMBIAR CONTRASEÑA */}
      <form className="admin-form-grid" onSubmit={changePassword}>
        <h3 className="full-width">Cambiar contraseña</h3>

        <PasswordField
          label="Contraseña actual"
          value={passwords.actual}
          visible={mostrarPassword.actual}
          onChange={(value) => {
            setPasswords({ ...passwords, actual: value });
            setPasswordErrors({ ...passwordErrors, actual: '' });
          }}
          onToggle={() => setMostrarPassword({ ...mostrarPassword, actual: !mostrarPassword.actual })}
          error={passwordErrors.actual}
        />

        <PasswordField
          label="Nueva contraseña"
          value={passwords.nueva}
          visible={mostrarPassword.nueva}
          onChange={(value) => {
            setPasswords({ ...passwords, nueva: value });
            setPasswordErrors({ ...passwordErrors, nueva: '' });
          }}
          onToggle={() => setMostrarPassword({ ...mostrarPassword, nueva: !mostrarPassword.nueva })}
          error={passwordErrors.nueva}
        />

        {/* Indicador de requisitos de contraseña */}
        {passwords.nueva && (
          <div className="password-strength full-width">
            <div className="strength-header">
              <span className="strength-label">Requisitos de seguridad:</span>
              <span className={`strength-percentage ${totalRequisitos === 5 ? 'completo' : totalRequisitos >= 3 ? 'intermedio' : 'bajo'}`}>
                {totalRequisitos}/5
              </span>
            </div>
            <div className="strength-requirements">
              <div className={`requirement ${requisitosActuales.minLongitud ? 'cumplido' : ''}`}>
                <span>•</span>
                <span>Al menos 8 caracteres</span>
              </div>
              <div className={`requirement ${requisitosActuales.tieneMayuscula ? 'cumplido' : ''}`}>
                <span>•</span>
                <span>Una letra mayúscula (A-Z)</span>
              </div>
              <div className={`requirement ${requisitosActuales.tieneMinuscula ? 'cumplido' : ''}`}>
                <span>•</span>
                <span>Una letra minúscula (a-z)</span>
              </div>
              <div className={`requirement ${requisitosActuales.tieneNumero ? 'cumplido' : ''}`}>
                <span>•</span>
                <span>Un número (0-9)</span>
              </div>
              <div className={`requirement ${requisitosActuales.tieneEspecial ? 'cumplido' : ''}`}>
                <span>•</span>
                <span>Un símbolo especial (!@#$%^&*)</span>
              </div>
            </div>
          </div>
        )}

        <PasswordField
          label="Confirmar contraseña"
          value={passwords.confirmacion}
          visible={mostrarPassword.confirmacion}
          onChange={(value) => {
            setPasswords({ ...passwords, confirmacion: value });
            setPasswordErrors({ ...passwordErrors, confirmacion: '' });
          }}
          onToggle={() => setMostrarPassword({ ...mostrarPassword, confirmacion: !mostrarPassword.confirmacion })}
          error={passwordErrors.confirmacion}
        />

        <button className="btn-form" type="submit" disabled={cargandoPassword}>
          {cargandoPassword ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>

        {mensajePassword && (
          <p className={`form-message full-width ${tipoMensajePassword === 'exito' ? 'success' : 'error'}`}>
            {mensajePassword}
          </p>
        )}
      </form>
    </div>
  );
}

function PasswordField({ label, value, visible, onChange, onToggle, error }: { label: string; value: string; visible: boolean; onChange: (value: string) => void; onToggle: () => void; error?: string }) {
  return (
    <label>
      {label}
      <span className="password-box">
        <input
          type={visible ? 'text' : 'password'}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={error ? 'input-error' : ''}
        />
        <button
          type="button"
          className="password-eye"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          onClick={onToggle}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </span>
      {error && <small className="error-text">{error}</small>}
    </label>
  );
}
