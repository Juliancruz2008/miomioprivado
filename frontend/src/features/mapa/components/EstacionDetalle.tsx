// Panel lateral de detalle de una estación: estado, favoritos, reserva rápida,
// calificar y reportar. Corresponde a mostrarDetallesEstacion() + funciones
// de favoritos/calificación/reporte/reserva en mapa.html original.
import { useEffect, useState } from 'react';
import type { Usuario } from '../../../api/auth.api';
import { obtenerEstadoEstacion, type EstadoEstacion } from '../../../api/estado.api';
import { listarFavoritos, agregarFavorito, quitarFavorito } from '../../../api/favoritos.api';
import { calificar, calificacionesDeEstacion, type CalificacionPublica, type ResumenCalificaciones } from '../../../api/calificaciones.api';
import { crearReporte, reportesDeEstacion, type Reporte } from '../../../api/reportes.api';
import { crearReservaConfirmada, type ReservaCreate } from '../../../api/reservas.api';
import { cambiarEstadoEstacionOcm } from '../../../api/admin.api';
import { listarMetodosPago, type MetodoPago } from '../../../api/metodosPago.api';
import { ModalPago } from '../../../components/ModalPago';
import { notificar } from '../../../components/GlobalNotifications';
import { cotizarReserva } from '../../../api/tarifas.api';
import type { EstacionOCM } from '../types';
import { contieneLenguajeOfensivo, mensajeContenidoOfensivo } from '../../../utils/contentFilter';

interface Props {
  estacion: EstacionOCM;
  usuario: Usuario | null;
  onLoginRequerido: () => void;
  onCalcularRuta: (lat: number, lon: number) => void;
  onClose: () => void;
  filtroConector?: string;
  tipoConectorVehiculo?: string;
}

const TIPOS_REPORTE = [
  { valor: 'averia', etiqueta: 'Avería', icono: 'fa-screwdriver-wrench' },
  { valor: 'fuera_servicio', etiqueta: 'Fuera de servicio', icono: 'fa-circle-xmark' },
  { valor: 'ocupado', etiqueta: 'Ocupado', icono: 'fa-clock' },
  { valor: 'otro', etiqueta: 'Otro', icono: 'fa-circle-question' },
];

function proximaHoraISO(): string {
  const ahora = new Date();
  ahora.setMinutes(0, 0, 0);
  ahora.setHours(ahora.getHours() + 1);
  return ahora.toISOString().slice(0, 16);
}

function etiquetaEstadoReporte(estado?: string) {
  if (estado === 'resuelto') return 'Resuelto';
  if (estado === 'mantenimiento') return 'En mantenimiento';
  if (estado === 'fuera_servicio') return 'Fuera de servicio';
  return 'Abierto';
}

function claseEstadoReporte(estado?: string) {
  if (estado === 'resuelto') return 'report-status-resolved';
  if (estado === 'mantenimiento') return 'report-status-maintenance';
  if (estado === 'fuera_servicio') return 'report-status-out-of-service';
  return 'report-status-open';
}

export function EstacionDetalle({ estacion, usuario, onLoginRequerido, onCalcularRuta, onClose, filtroConector = 'TODOS', tipoConectorVehiculo = '' }: Props) {
  const ocmId = String(estacion.ID);
  const nombre = estacion.AddressInfo?.Title || 'Estación';
  const ciudad = estacion.ciudad || estacion.City || '';
  const direccion = estacion.AddressInfo?.AddressLine1 || '—';
  const operador = estacion.OperatorInfo?.Title || 'Independiente';
  const lat = estacion.AddressInfo?.Latitude;
  const lon = estacion.AddressInfo?.Longitude;
  const conexionesCompatibles = (estacion.Connections || []).filter((c) => {
    const tipo = (c.ConnectionType?.Title || '').toLowerCase();
    const porFiltro = filtroConector === 'TODOS' || tipo.includes(filtroConector.toLowerCase());
    const porVehiculo = !tipoConectorVehiculo || tipo.includes(tipoConectorVehiculo.toLowerCase());
    return porFiltro && porVehiculo;
  });

  const [estado, setEstado] = useState<EstadoEstacion | null>(null);
  const [estadoAdministrativo, setEstadoAdministrativo] = useState<'activa' | 'mantenimiento' | 'inactiva'>('activa');
  const [esFavorito, setEsFavorito] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Reserva rápida
  const [duracion, setDuracion] = useState(2);
  const [inicio, setInicio] = useState(proximaHoraISO());
  const [reservando, setReservando] = useState(false);
  const [pagoReserva, setPagoReserva] = useState<{ id: string; monto: number } | null>(null);
  const [reservaPendiente, setReservaPendiente] = useState<ReservaCreate | null>(null);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [cargadorSeleccionado, setCargadorSeleccionado] = useState<string | null>(null);
  const [precioEstimado, setPrecioEstimado] = useState<number | null>(null);
  const [cargandoPrecio, setCargandoPrecio] = useState(false);

  // Calificación
  const [mostrarCalificar, setMostrarCalificar] = useState(false);
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState('');
  const [resumenCalificaciones, setResumenCalificaciones] = useState<ResumenCalificaciones | null>(null);
  const [mostrarTodasCalificaciones, setMostrarTodasCalificaciones] = useState(false);

  // Reporte
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('');
  const [descReporte, setDescReporte] = useState('');
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [reportesEstacion, setReportesEstacion] = useState<Reporte[]>([]);

  const finCalculado = new Date(new Date(inicio).getTime() + duracion * 60 * 60 * 1000);
  const finInvalido = new Date(inicio) < new Date();
  const cargadoresReservados = (estado?.cargadores_reservados as string[] | undefined) || [];
  const hayCargadorCompatibleDisponible = conexionesCompatibles.some((_, indice) => {
    const original = (estacion.Connections || []).indexOf(conexionesCompatibles[indice]);
    return !cargadoresReservados.includes(`${ocmId}-${original + 1}`);
  });
  const estadoPanel = estado?.estado === 'mantenimiento' || estado?.estado === 'inactiva'
    ? estado.estado
    : conexionesCompatibles.length > 0 && !hayCargadorCompatibleDisponible ? 'reservada' : 'disponible';

  const refrescarEstadoEstacion = async () => {
    try {
      const actualizado = await obtenerEstadoEstacion(ocmId);
      setEstado(actualizado);
      if (actualizado.estado === 'mantenimiento' || actualizado.estado === 'inactiva') setEstadoAdministrativo(actualizado.estado);
      else setEstadoAdministrativo('activa');
      return actualizado;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setMostrarCalificar(false);
    setMostrarReporte(false);
    setPuntaje(0);
    setComentario('');
    setResumenCalificaciones(null);
    setMostrarTodasCalificaciones(false);
    setTipoReporte('');
    setDescReporte('');
    setReportesEstacion([]);
    setInicio(proximaHoraISO());
    setDuracion(2);
    setPagoReserva(null);
    setReservaPendiente(null);
    setCargadorSeleccionado(null);
    setPrecioEstimado(null);

    obtenerEstadoEstacion(ocmId)
      .then((data) => {
        if (cancelado) return;
        setEstado(data);
        if (data.estado === 'mantenimiento' || data.estado === 'inactiva') setEstadoAdministrativo(data.estado);
        else setEstadoAdministrativo('activa');
      })
      .catch(() => !cancelado && setEstado(null));

    calificacionesDeEstacion(ocmId)
      .then((data) => !cancelado && setResumenCalificaciones(data))
      .catch(() => !cancelado && setResumenCalificaciones({ promedio: 0, total: 0, calificaciones: [] }));

    reportesDeEstacion(ocmId)
      .then((data) => !cancelado && setReportesEstacion(data))
      .catch(() => !cancelado && setReportesEstacion([]));

    if (usuario) {
      listarFavoritos()
        .then((favs) => !cancelado && setEsFavorito(favs.some((f) => f.estacion_ocm_id === ocmId)))
        .catch(() => {});
      listarMetodosPago().then(setMetodosPago).catch(() => setMetodosPago([]));
    }
    setCargando(false);

    return () => {
      cancelado = true;
    };
  }, [ocmId, usuario]);

  useEffect(() => {
    if (!cargadorSeleccionado) {
      setPrecioEstimado(null);
      return;
    }
    const indiceCargador = Number(cargadorSeleccionado.split('-').pop()) - 1;
    const cargador = estacion.Connections?.[indiceCargador];
    let cancelado = false;
    setCargandoPrecio(true);
    cotizarReserva({
      estacion_nombre: nombre,
      operador,
      tipo_cargador: cargador?.ConnectionType?.Title || '',
      potencia_kw: cargador?.PowerKW,
      duracion_horas: duracion,
    }).then((cotizacion) => {
      if (!cancelado) setPrecioEstimado(cotizacion.total);
    }).catch(() => {
      if (!cancelado) setPrecioEstimado(null);
    }).finally(() => {
      if (!cancelado) setCargandoPrecio(false);
    });
    return () => { cancelado = true; };
  }, [cargadorSeleccionado, duracion, nombre, operador, ocmId]);

  useEffect(() => {
    const sincronizarTrasReserva = () => { void refrescarEstadoEstacion(); };
    window.addEventListener('ev-charge:estaciones-actualizadas', sincronizarTrasReserva);
    return () => window.removeEventListener('ev-charge:estaciones-actualizadas', sincronizarTrasReserva);
  }, [ocmId]);

  if (!usuario) {
    return (
      <>
        <p style={{ color: '#888', fontSize: 14 }}><i className="fa-solid fa-lock"></i> Inicia sesión para ver detalles.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn-outline-sm" onClick={onLoginRequerido}>Iniciar sesión</button>
        </div>
      </>
    );
  }

  const toggleFavorito = async () => {
    try {
      if (esFavorito) {
        await quitarFavorito(ocmId);
        setEsFavorito(false);
      } else {
        await agregarFavorito({ estacion_ocm_id: ocmId, estacion_nombre: nombre });
        setEsFavorito(true);
      }
    } catch (e) {
      notificar({ tipo: 'error', titulo: 'Favoritos', mensaje: e instanceof Error ? e.message : 'Error al actualizar favorito' });
    }
  };

  const enviarCalificacion = async () => {
    if (!puntaje) return notificar({ tipo: 'warning', titulo: 'Calificación', mensaje: 'Selecciona una calificación de 1 a 5' });
    if (contieneLenguajeOfensivo(comentario)) return notificar({ tipo: 'warning', titulo: 'Contenido no permitido', mensaje: mensajeContenidoOfensivo });
    try {
      await calificar({ estacion_ocm_id: ocmId, estacion_nombre: nombre, puntaje, comentario });
      notificar({ tipo: 'success', titulo: 'Calificación enviada', mensaje: 'Tu opinión fue registrada correctamente.' });
      setMostrarCalificar(false);
      const actualizado = await calificacionesDeEstacion(ocmId);
      setResumenCalificaciones(actualizado);
    } catch (e) {
      notificar({ tipo: 'error', titulo: 'Calificación', mensaje: e instanceof Error ? e.message : 'Error al enviar calificación' });
    }
  };

  const enviarReporte = async () => {
    if (!tipoReporte) return notificar({ tipo: 'warning', titulo: 'Reporte', mensaje: 'Selecciona el tipo de problema' });
    if (contieneLenguajeOfensivo(descReporte)) return notificar({ tipo: 'warning', titulo: 'Contenido no permitido', mensaje: mensajeContenidoOfensivo });
    setEnviandoReporte(true);
    try {
      await crearReporte({ estacion_ocm_id: ocmId, estacion_nombre: nombre, tipo: tipoReporte, descripcion: descReporte });
      notificar({ tipo: 'success', titulo: 'Reporte enviado', mensaje: 'Gracias por ayudarnos a mantener actualizada la estación.' });
      setMostrarReporte(false);
    } catch (e) {
      notificar({ tipo: 'error', titulo: 'Reporte', mensaje: e instanceof Error ? e.message : 'Error al enviar reporte' });
    } finally {
      setEnviandoReporte(false);
    }
  };

  const actualizarEstadoComoAdmin = async (nuevoEstado: 'activa' | 'mantenimiento' | 'inactiva') => {
    try {
      await cambiarEstadoEstacionOcm(ocmId, nuevoEstado);
      setEstadoAdministrativo(nuevoEstado);
      setEstado({ ...estado, estacion_ocm_id: ocmId, estado: nuevoEstado });
      notificar({ tipo: 'success', titulo: 'Estación actualizada', mensaje: 'El estado se actualizó correctamente.' });
    } catch (e) {
      notificar({ tipo: 'error', titulo: 'Estación', mensaje: e instanceof Error ? e.message : 'No se pudo actualizar el estado de la estación' });
    }
  };

  const confirmarReserva = async () => {
    if (!cargadorSeleccionado) return notificar({ tipo: 'warning', titulo: 'Reserva', mensaje: 'Selecciona un cargador disponible antes de continuar.' });
    const fechaInicio = new Date(inicio);
    if (fechaInicio >= finCalculado) return notificar({ tipo: 'warning', titulo: 'Reserva', mensaje: 'La fecha de inicio debe ser anterior a la de fin.' });
    if (fechaInicio < new Date()) return notificar({ tipo: 'warning', titulo: 'Reserva', mensaje: 'No se puede reservar en el pasado. Elige una fecha futura.' });
    setReservando(true);
    try {
      const estadoActual = await refrescarEstadoEstacion();
      if (estadoActual?.estado === 'mantenimiento' || estadoActual?.estado === 'inactiva') {
        return notificar({ tipo: 'warning', titulo: 'Reserva', mensaje: 'La estación dejó de estar disponible para reservar.' });
      }
      if (estadoActual?.cargadores_reservados?.includes(cargadorSeleccionado)) {
        setCargadorSeleccionado(null);
        return notificar({ tipo: 'warning', titulo: 'Cargador no disponible', mensaje: 'Este cargador acaba de ser reservado. Selecciona otro cargador disponible.' });
      }
      const datosReserva: ReservaCreate = {
        estacion_ocm_id: ocmId,
        cargador_id: cargadorSeleccionado,
        estacion_nombre: nombre,
        fecha_hora_inicio: fechaInicio.toISOString(),
        fecha_hora_fin: finCalculado.toISOString(),
      };
      const indiceCargador = Number(cargadorSeleccionado.split('-').pop()) - 1;
      const cargador = estacion.Connections?.[indiceCargador];
      const cotizacion = await cotizarReserva({
        estacion_nombre: nombre,
        operador,
        tipo_cargador: cargador?.ConnectionType?.Title || '',
        potencia_kw: cargador?.PowerKW,
        duracion_horas: duracion,
      });
      setReservaPendiente(datosReserva);
      setPagoReserva({ id: `RESERVA-${Date.now()}`, monto: cotizacion.total });
    } catch (e) {
      notificar({ tipo: 'error', titulo: 'Reserva', mensaje: e instanceof Error ? e.message : 'Error al reservar' });
    } finally {
      setReservando(false);
    }
  };

  return (
    <>
      <h3>{nombre}</h3>
      {cargando ? (
        <div className="badge badge-gray">Consultando...</div>
      ) : estadoPanel === 'disponible' ? (
        <div className="badge badge-green"><i className="fa-solid fa-circle-check"></i> Disponible</div>
      ) : estadoPanel === 'reservada' ? (
        <div className="badge badge-blue"><i className="fa-solid fa-clock"></i> Reservada por {String(estado?.reservado_por || 'otro usuario')}</div>
      ) : estadoPanel === 'mantenimiento' ? (
        <div className="badge badge-yellow"><i className="fa-solid fa-screwdriver-wrench"></i> En mantenimiento</div>
      ) : estadoPanel === 'inactiva' ? (
        <div className="badge badge-red">Estación fuera de servicio</div>
      ) : null}

      {usuario.is_admin && (
        <label className="admin-station-status">
          Estado administrativo
          <select value={estadoAdministrativo} onChange={(event) => void actualizarEstadoComoAdmin(event.target.value as 'activa' | 'mantenimiento' | 'inactiva')}>
            <option value="activa">Activa</option>
            <option value="mantenimiento">En mantenimiento</option>
          <option value="inactiva">Fuera de servicio</option>
          </select>
        </label>
      )}

      <div style={{ margin: '8px 0', fontSize: 13, color: '#aaa' }}><i className="fa-solid fa-location-dot"></i> {direccion}{ciudad && ` · ${ciudad}`}</div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Operador: {operador}</div>

      <div style={{ fontWeight: 600, fontSize: 12, color: '#999', margin: '8px 0 4px' }}>Conectores</div>
      {(estacion.Connections || []).map((c, i) => {
        const cargadorId = `${ocmId}-${i + 1}`;
        const tipoCargador = c.ConnectionType?.Title || '';
        const compatibleFiltro = filtroConector === 'TODOS' || tipoCargador.toLowerCase().includes(filtroConector.toLowerCase());
        const compatibleVehiculo = !tipoConectorVehiculo || tipoCargador.toLowerCase().includes(tipoConectorVehiculo.toLowerCase());
        const compatible = compatibleFiltro && compatibleVehiculo;
        const reservados = (estado?.cargadores_reservados as string[] | undefined) || [];
        const reservado = reservados.includes(cargadorId);
        const bloqueado = reservado || estadoAdministrativo !== 'activa';
        const recomendado = compatible && !reservado && estadoAdministrativo === 'activa';
        return <div className={`connector-card connector-status-${reservado ? 'reservado' : estadoAdministrativo !== 'activa' ? estadoAdministrativo : 'disponible'}${cargadorSeleccionado === cargadorId ? ' connector-selected' : ''}${compatible ? ' connector-compatible' : ' connector-incompatible'}${recomendado ? ' connector-recommended' : ''}`} key={cargadorId}>
          <div className="connector-heading"><strong><i className="fa-solid fa-plug"></i> {tipoCargador || 'Genérico'}</strong>{recomendado && <span className="connector-recommended-badge"><i className="fa-solid fa-check"></i> Para tu vehículo</span>}</div>
          <small>{c.PowerKW ? `${c.PowerKW} kW` : 'Potencia no especificada'} · {c.CurrentType?.Title || 'AC/DC'}</small>{' '}
          <small>Bahías: {c.Quantity || 1}</small>
          <div className="connector-status-row"><small>ID: {cargadorId}</small><span className={`connector-state ${bloqueado ? (reservado ? 'reserved' : 'unavailable') : 'available'}`}>{reservado ? 'Reservado' : estadoAdministrativo === 'mantenimiento' ? 'Mantenimiento' : estadoAdministrativo === 'inactiva' ? 'Fuera de servicio' : 'Disponible'}</span></div>
          {compatible && <small className="connector-compatible-label"><i className="fa-solid fa-circle-check"></i> Compatible con tu búsqueda</small>}
          {!usuario.is_admin && <button type="button" className="connector-select-button" disabled={bloqueado || !compatible} onClick={() => setCargadorSeleccionado(cargadorSeleccionado === cargadorId ? null : cargadorId)}>{cargadorSeleccionado === cargadorId ? 'Cargador seleccionado' : bloqueado ? 'No disponible' : compatible ? 'Seleccionar cargador' : 'No compatible'}</button>}
        </div>;
      })}

      <section className="station-ratings" aria-label="Calificaciones de la estación">
        <div className="station-ratings-header">
          <strong>Calificaciones de usuarios</strong>
          {resumenCalificaciones && <span>{resumenCalificaciones.promedio.toFixed(1)}/5 ({resumenCalificaciones.total})</span>}
        </div>
        {!resumenCalificaciones ? <p>Consultando calificaciones...</p> : resumenCalificaciones.calificaciones.length === 0 ? <p>Aún no hay calificaciones para esta estación.</p> : (mostrarTodasCalificaciones ? resumenCalificaciones.calificaciones : resumenCalificaciones.calificaciones.slice(0, 2)).map((calificacion: CalificacionPublica) => (
          <article className="station-rating" key={calificacion.id}>
            <div className="station-rating-top"><strong>{calificacion.usuario_nombre}</strong><time dateTime={calificacion.fecha}>{new Date(calificacion.fecha).toLocaleDateString('es-CO')}</time></div>
            <div className="station-rating-score" aria-label={`${calificacion.puntaje} de 5 estrellas`}>{'★'.repeat(calificacion.puntaje)}<span>{'★'.repeat(5 - calificacion.puntaje)}</span></div>
            {calificacion.comentario && <p>{calificacion.comentario}</p>}
          </article>
        ))}
        {resumenCalificaciones && resumenCalificaciones.calificaciones.length > 2 && (
          <button className="ratings-toggle" type="button" onClick={() => setMostrarTodasCalificaciones((visible) => !visible)}>
            {mostrarTodasCalificaciones ? 'Ver menos' : 'Ver más calificaciones'}
            <i className={`fa-solid fa-chevron-${mostrarTodasCalificaciones ? 'up' : 'down'}`}></i>
          </button>
        )}
      </section>

      <section className="station-ratings" aria-label="Incidencias de la estación">
        <div className="station-ratings-header"><strong>Incidencias reportadas</strong><span>{reportesEstacion.length}</span></div>
        {reportesEstacion.length === 0 ? <p>No hay incidencias reportadas.</p> : reportesEstacion.slice(0, 5).map((reporte) => <article className="station-rating" key={reporte.id}><div className="report-mini-heading"><strong>{reporte.tipo.replace('_', ' ')}</strong><span className={`report-status-mini ${claseEstadoReporte(reporte.estado)}`}><i className="fa-solid fa-circle"></i> {etiquetaEstadoReporte(reporte.estado)}</span></div><p>{reporte.descripcion || 'Sin descripción'}</p></article>)}
      </section>

      {estadoPanel === 'disponible' && !usuario.is_admin && (
        <div className="reserva-box" style={{ display: 'block' }}>
          <div className="duracion-control">
            <label style={{ fontSize: 12, color: '#aaa', marginRight: 8 }}>Duración:</label>
            <input type="range" min={1} max={8} step={1} value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} />
            <span>{duracion} h</span>
          </div>
          <div className="form-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: '#aaa', margin: 0 }}>Inicio:</label>
            <input type="datetime-local" style={{ flex: 1 }} value={inicio} onChange={(e) => setInicio(e.target.value)} />
            <button className="btn-now" onClick={() => setInicio(proximaHoraISO())}>Ahora</button>
          </div>
          <div className="form-group">
            <label style={{ fontSize: 12, color: '#aaa' }}>Fin:</label>
            <input
              type="datetime-local"
              readOnly
              value={finCalculado.toISOString().slice(0, 16)}
              style={{ background: '#2a2a2a', opacity: 0.7, border: finInvalido ? '1px solid #e74c3c' : '1px solid #555' }}
            />
          </div>
          <div className="reservation-price-preview" aria-live="polite">
            <span><i className="fa-solid fa-receipt"></i> Costo estimado</span>
            <strong>{cargandoPrecio ? 'Calculando…' : precioEstimado != null ? `$${precioEstimado.toLocaleString('es-CO')} COP` : 'Selecciona un cargador'}</strong>
          </div>
          <button className="btn btn-primary btn-block" disabled={reservando || !cargadorSeleccionado} onClick={confirmarReserva}>
            {reservando ? 'Procesando...' : 'Confirmar Reserva'}
          </button>
        </div>
      )}

      {!usuario.is_admin && (
        <div className="station-actions" aria-label="Acciones de la estación">
          <button title="Guardar estación en favoritos" className={`btn-outline-sm${esFavorito ? ' btn-primary' : ''}`} onClick={toggleFavorito}>
            <i className={`fa-${esFavorito ? 'solid' : 'regular'} fa-star`}></i> Favorito
          </button>
          {lat != null && lon != null && (
            <button title="Calcular ruta hasta esta estación" className="btn-ruta" onClick={() => onCalcularRuta(lat, lon)}><i className="fa-solid fa-route"></i> Ruta</button>
          )}
          <button title="Calificar esta estación" className="btn-outline-sm" onClick={() => setMostrarCalificar((v) => !v)}><i className="fa-solid fa-star"></i> Calificar</button>
          <button title="Reportar un problema" className="btn-outline-sm" onClick={() => setMostrarReporte((v) => !v)}><i className="fa-solid fa-bullhorn"></i> Reportar</button>
        </div>
      )}

      {mostrarCalificar && (
        <div style={{ marginTop: 8, background: '#1e1e1e', padding: 12, borderRadius: 6 }}>
          <p style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Tu calificación:</p>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`star${i <= puntaje ? ' filled' : ''}`} onClick={() => setPuntaje(i)}>
                <i className="fa-solid fa-star"></i>
              </span>
            ))}
          </div>
          <textarea
            rows={2}
            style={{ width: '100%', marginTop: 8, padding: 6, background: '#0d0d0d', border: '1px solid #333', borderRadius: 4, color: '#fff', fontSize: 12, resize: 'vertical' }}
            placeholder="Comentario (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <button className="btn-outline-sm" style={{ marginTop: 6, background: '#39a900', color: '#fff', border: 'none', padding: '6px 12px' }} onClick={enviarCalificacion}>
            Enviar
          </button>
        </div>
      )}

      {mostrarReporte && (
        <div style={{ marginTop: 8, background: '#1e1e1e', padding: 12, borderRadius: 6 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {TIPOS_REPORTE.map((t) => (
              <button
                key={t.valor}
                type="button"
                className={`report-type-button report-type-${t.valor}${tipoReporte === t.valor ? ' selected' : ''}`}
                onClick={() => setTipoReporte(t.valor)}
                aria-pressed={tipoReporte === t.valor}
              >
                <i className={`fa-solid ${t.icono}`}></i> {t.etiqueta}
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            style={{ width: '100%', padding: 6, background: '#0d0d0d', border: '1px solid #333', borderRadius: 4, color: '#fff', fontSize: 12, resize: 'vertical' }}
            placeholder="Descripción"
            value={descReporte}
            onChange={(e) => setDescReporte(e.target.value)}
          />
          <button
            className="btn-outline-sm"
            style={{ marginTop: 6, background: '#39a900', color: '#fff', border: 'none', padding: '6px 12px' }}
            disabled={enviandoReporte}
            onClick={enviarReporte}
          >
            {enviandoReporte ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </div>
      )}

      {pagoReserva && <ModalPago tipo="reserva" tituloItem={nombre} monto={pagoReserva.monto} idReferencia={pagoReserva.id} metodosGuardados={metodosPago} onCerrar={() => { setPagoReserva(null); setReservaPendiente(null); }} onExito={async () => { if (!reservaPendiente) return; try { const reservaConfirmada = await crearReservaConfirmada(reservaPendiente); const cargadoresActualizados = new Set(estado?.cargadores_reservados || []); if (reservaConfirmada.cargador_id) cargadoresActualizados.add(reservaConfirmada.cargador_id); setEstado((actual) => ({ ...(actual || {}), estacion_ocm_id: ocmId, estado: 'disponible', cargadores_reservados: [...cargadoresActualizados] })); setCargadorSeleccionado(null); window.localStorage.setItem('ev-charge:estaciones-actualizadas', String(Date.now())); window.dispatchEvent(new Event('ev-charge:estaciones-actualizadas')); notificar({ tipo: 'success', titulo: 'Reserva confirmada', mensaje: 'Pago aprobado y reserva aceptada correctamente.' }); } catch (e) { await refrescarEstadoEstacion(); notificar({ tipo: 'error', titulo: 'Reserva', mensaje: e instanceof Error ? e.message : 'El pago fue aprobado, pero no se pudo crear la reserva.' }); } finally { setReservaPendiente(null); } }} />}

      <p style={{ fontSize: 10, color: '#444', textAlign: 'center', marginTop: 12 }}>OCM ID: {ocmId}</p>
    </>
  );
}
