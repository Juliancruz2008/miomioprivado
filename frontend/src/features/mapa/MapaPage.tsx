// Migrado desde public/mapa.html. Corresponde a mapa_controller.py / mapa_routes.py
// para la ruta vial; las estaciones se cargan directo de OpenChargeMap (API externa),
// igual que en el original.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/estilos_mapa.css';
import '../../styles/dashboard.css';
import '../../styles/admin.css';
import { useAuth } from '../../context/AuthContext';
import { AuthModal, type AuthTab } from '../../components/AuthModal';
import { notificar } from '../../components/GlobalNotifications';
import { planificarViaje } from '../../api/mapa.api';
import { api } from '../../api/httpClient';
import { EstacionDetalle } from './components/EstacionDetalle';
import { obtenerEstadoEstacion } from '../../api/estado.api';
import { listarVehiculos, type Vehiculo } from '../../api/vehiculos.api';
import type { EstacionOCM } from './types';

const BOGOTA: [number, number] = [4.6651, -74.1204];
const LIMITES_COLOMBIA: L.LatLngBoundsExpression = [[-4.5, -81.5], [13.8, -66.5]];

const ciudadCanonica = (ciudad?: string) => {
  const valor = (ciudad || '').trim();
  const clave = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ');
  if (clave === 'bogota' || clave === 'bogota dc' || clave === 'bogota d c' || clave === 'bogota distrito capital') return 'Bogotá';
  if (clave === 'medellin') return 'Medellín';
  if (clave === 'tunja') return 'Tunja';
  if (clave === 'ibague') return 'Ibagué';
  if (clave === 'cucuta') return 'Cúcuta';
  return valor;
};

const departamentoCanonico = (departamento?: string) => {
  const valor = (departamento || '').trim();
  const clave = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ');
  if (clave === 'dc' || clave === 'bogota' || clave === 'bogota dc' || clave === 'bogota distrito capital') return 'Bogotá D.C.';
  const nombres: Record<string, string> = {
    antioquia: 'Antioquia', boyaca: 'Boyacá', bolivar: 'Bolívar', cauca: 'Cauca',
    caldas: 'Caldas', cundinamarca: 'Cundinamarca', meta: 'Meta', narino: 'Nariño',
    quindio: 'Quindío', santander: 'Santander', tolima: 'Tolima', huila: 'Huila',
    atlantico: 'Atlántico', cordoba: 'Córdoba', cesar: 'Cesar', guajira: 'La Guajira',
    risaralda: 'Risaralda', sucre: 'Sucre', valle: 'Valle del Cauca', 'valle del cauca': 'Valle del Cauca',
  };
  return nombres[clave] || valor;
};

const colorEstado = (estado: string) => estado === 'mantenimiento' ? '#f39c12' : estado === 'inactiva' ? '#e74c3c' : estado === 'reservada' ? '#3498db' : '#39a900';
const crearIconoEstacion = (estado: string, seleccionado = false) => {
  const color = colorEstado(estado);
  const dimension = seleccionado ? 28 : 22;
  const sombra = seleccionado ? `0 0 0 3px ${color}, 0 4px 12px rgba(0,0,0,0.6)` : `0 0 0 2px ${color}, 0 3px 8px rgba(0,0,0,0.5)`;
  return L.divIcon({
    html: `<div style="width:${dimension}px;height:${dimension}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:${sombra};"></div>`,
    iconSize: [dimension, dimension],
    iconAnchor: [dimension / 2, dimension / 2],
    className: '',
  });
};

export function MapaPage() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const marcadoresRef = useRef<L.Marker[]>([]);
  const rutaCapaRef = useRef<L.GeoJSON | null>(null);
  const usuarioMarcadorRef = useRef<L.Marker | null>(null);

  const [estaciones, setEstaciones] = useState<EstacionOCM[]>([]);
  const [estadosEstaciones, setEstadosEstaciones] = useState<Record<string, { estado: string; cargadores_reservados?: string[] }>>({});
  const [filtro, setFiltro] = useState('TODOS');
  const [filtroCiudad, setFiltroCiudad] = useState('TODAS');
  const [filtroDepartamento, setFiltroDepartamento] = useState('TODOS');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [estacionSeleccionada, setEstacionSeleccionada] = useState<EstacionOCM | null>(null);
  const [infoRuta, setInfoRuta] = useState<string | null>(null);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [navegando, setNavegando] = useState(false);
  const [navegacionPausada, setNavegacionPausada] = useState(false);
  const [distanciaRestante, setDistanciaRestante] = useState<number | null>(null);
  const [proximaInstruccion, setProximaInstruccion] = useState('');
  const [desvioRuta, setDesvioRuta] = useState(false);
  const [vehiculosUsuario, setVehiculosUsuario] = useState<Vehiculo[]>([]);
  const [vehiculoFiltroId, setVehiculoFiltroId] = useState('');

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const rutaCoordsRef = useRef<[number, number][]>([]);
  const destinoRutaRef = useRef<[number, number] | null>(null);
  const instruccionesRef = useRef<Array<{ nombre: string; modificador: string; distancia_m: number }>>([]);
  const recalculandoRutaRef = useRef(false);
  const ultimaPosicionRef = useRef<[number, number] | null>(null);
  const simulacionRef = useRef<number | null>(null);
  const [simulandoNavegacion, setSimulandoNavegacion] = useState(false);

  const distanciaKm = (a: [number, number], b: [number, number]) => {
    const radio = 6371;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLon = (b[1] - a[1]) * Math.PI / 180;
    const lat1 = a[0] * Math.PI / 180;
    const lat2 = b[0] * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return radio * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };

  const actualizarPosicion = (pos: GeolocationPosition) => {
    const actual: [number, number] = [pos.coords.latitude, pos.coords.longitude];
    if (!usuarioMarcadorRef.current || !mapRef.current) return;
    if (ultimaPosicionRef.current && distanciaKm(actual, ultimaPosicionRef.current) < 0.008) return;
    ultimaPosicionRef.current = actual;
    usuarioMarcadorRef.current.setLatLng(actual);
    const puntos = rutaCoordsRef.current;
    if (!puntos.length) return;
    let indiceCercano = 0;
    let distanciaCercana = Number.POSITIVE_INFINITY;
    puntos.forEach((punto, indice) => {
      const distancia = distanciaKm(actual, punto);
      if (distancia < distanciaCercana) { distanciaCercana = distancia; indiceCercano = indice; }
    });
    const destino = destinoRutaRef.current;
    if (destino) setDistanciaRestante(Math.max(0, distanciaKm(actual, destino)));
    const estaDesviado = distanciaCercana > 0.5;
    setDesvioRuta(estaDesviado);
    if (estaDesviado && destino && !recalculandoRutaRef.current) {
      recalculandoRutaRef.current = true;
      planificarViaje(actual[0], actual[1], destino[0], destino[1], 300)
        .then((plan) => {
          if (!mapRef.current) return;
          if (rutaCapaRef.current) mapRef.current.removeLayer(rutaCapaRef.current);
          const nuevaCapa = L.geoJSON(plan.geometry as GeoJSON.GeoJsonObject, { style: { color: '#1769ff', weight: 7, opacity: 0.95 } }).addTo(mapRef.current);
          rutaCapaRef.current = nuevaCapa;
          rutaCoordsRef.current = plan.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
          instruccionesRef.current = (plan.instrucciones || []).map((paso) => ({ nombre: paso.nombre, modificador: paso.modificador, distancia_m: paso.distancia_m }));
          setInfoRuta(`Ruta recalculada: ${plan.distancia_total_km} km · Tiempo: ${plan.duracion_min} min`);
          setDesvioRuta(false);
        })
        .catch(() => setInfoRuta('No se pudo recalcular la ruta. Puedes intentarlo nuevamente.'))
        .finally(() => { recalculandoRutaRef.current = false; });
    }
    const instruccion = instruccionesRef.current.find((_, indice) => indice >= indiceCercano / Math.max(1, puntos.length) * instruccionesRef.current.length);
    if (instruccion) {
      const giro = instruccion.modificador ? `, ${instruccion.modificador}` : '';
      setProximaInstruccion(`Continúa por ${instruccion.nombre}${giro}`);
    }
    if (destino && distanciaKm(actual, destino) < 0.05) {
      setProximaInstruccion('Has llegado a la estación.');
    }
  };

  const detenerNavegacion = (limpiarRuta = false) => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (simulacionRef.current !== null) window.clearInterval(simulacionRef.current);
    watchIdRef.current = null;
    simulacionRef.current = null;
    setSimulandoNavegacion(false);
    setNavegando(false);
    setNavegacionPausada(false);
    if (limpiarRuta && mapRef.current) {
      if (rutaCapaRef.current) mapRef.current.removeLayer(rutaCapaRef.current);
      if (usuarioMarcadorRef.current) mapRef.current.removeLayer(usuarioMarcadorRef.current);
      rutaCapaRef.current = null;
      usuarioMarcadorRef.current = null;
      rutaCoordsRef.current = [];
      destinoRutaRef.current = null;
      setInfoRuta(null);
      setDistanciaRestante(null);
      setProximaInstruccion('');
      setDesvioRuta(false);
    }
  };

  const iniciarNavegacion = () => {
    if (!navigator.geolocation || !rutaCoordsRef.current.length) return;
    if (simulacionRef.current !== null) window.clearInterval(simulacionRef.current);
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    ultimaPosicionRef.current = null;
    setSimulandoNavegacion(false);
    setNavegando(true);
    setNavegacionPausada(false);
      watchIdRef.current = navigator.geolocation.watchPosition(actualizarPosicion, () => {
      setInfoRuta('No se pudo actualizar tu ubicación. Revisa el permiso de GPS.');
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 });
  };

  const iniciarSimulacion = () => {
    if (!rutaCoordsRef.current.length || !mapRef.current || !usuarioMarcadorRef.current) return;
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (simulacionRef.current !== null) window.clearInterval(simulacionRef.current);
    let indice = 0;
    setNavegando(true);
    setNavegacionPausada(false);
    setSimulandoNavegacion(true);
    simulacionRef.current = window.setInterval(() => {
      const punto = rutaCoordsRef.current[indice];
      const destino = destinoRutaRef.current;
      if (!punto || !destino || !usuarioMarcadorRef.current) {
        detenerNavegacion(false);
        return;
      }
      usuarioMarcadorRef.current.setLatLng(punto);
      setDistanciaRestante(distanciaKm(punto, destino));
      setInfoRuta('Navegación de prueba activa · ubicación simulada');
      indice += Math.max(1, Math.ceil(rutaCoordsRef.current.length / 35));
      if (indice >= rutaCoordsRef.current.length) {
        if (simulacionRef.current !== null) window.clearInterval(simulacionRef.current);
        simulacionRef.current = null;
        setSimulandoNavegacion(false);
        setNavegando(false);
        setProximaInstruccion('Prueba finalizada: llegaste a la estación.');
      }
    }, 1000);
  };

  useEffect(() => () => detenerNavegacion(), []);

  useEffect(() => {
    if (!usuario || usuario.is_admin) {
      setVehiculosUsuario([]);
      setVehiculoFiltroId('');
      return;
    }
    listarVehiculos()
      .then((vehiculos) => {
        const activos = vehiculos.filter((vehiculo) => vehiculo.activo !== false);
        setVehiculosUsuario(activos);
        setVehiculoFiltroId((actual) => actual && activos.some((vehiculo) => vehiculo.id === actual) ? actual : activos[0]?.id || '');
      })
      .catch(() => setVehiculosUsuario([]));
  }, [usuario]);

  useEffect(() => {
    document.body.classList.add('map-page');
    return () => document.body.classList.remove('map-page');
  }, []);

  useEffect(() => {
    const stationId = new URLSearchParams(location.search).get('estacion');
    if (!stationId || !mapRef.current) return;
    const station = estaciones.find((item) => String(item.ID) === stationId);
    if (!station?.AddressInfo) return;
    setEstacionSeleccionada(station);
    mapRef.current.setView([station.AddressInfo.Latitude, station.AddressInfo.Longitude], 15);
  }, [estaciones, location.search]);

  const abrirAuthModal = (tab: AuthTab) => {
    setAuthTab(tab);
    setAuthModalOpen(true);
  };

  const cerrarSesion = () => {
    logout();
    navigate('/');
  };

  // Inicializa el mapa una sola vez y carga las estaciones de OpenChargeMap.
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, {
      minZoom: 5,
      maxBounds: LIMITES_COLOMBIA,
      maxBoundsViscosity: 1,
    }).setView(BOGOTA, 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      noWrap: true,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    mapRef.current = map;

    const cargarEstaciones = () => {
      const cargar = (url: string, params?: Record<string, number>) => api.get<EstacionOCM[]>(url, { params });
      const solicitud = usuario?.is_admin ? cargar('/estaciones-mapa') : cargar('/estaciones-bogota');
      const cacheKey = `ev-charge:estaciones:${usuario?.is_admin ? 'admin' : 'bogota'}`;
      const mostrarEstaciones = (data: EstacionOCM[], guardar = false) => {
        const validas = data.filter((estacion) => {
          const lat = estacion.AddressInfo?.Latitude;
          const lon = estacion.AddressInfo?.Longitude;
          return Number.isFinite(lat) && Number.isFinite(lon);
        });
        setEstaciones(validas);
        if (guardar) {
          try { window.localStorage.setItem(cacheKey, JSON.stringify(validas)); } catch { /* La cache es opcional. */ }
        }
        if (validas.length) {
          const puntos = validas.map((estacion) => [
            estacion.AddressInfo!.Latitude,
            estacion.AddressInfo!.Longitude,
          ] as [number, number]);
          map.fitBounds(L.latLngBounds(puntos), { padding: [40, 40], maxZoom: 14 });
        }
      };
      try {
        const cache = window.localStorage.getItem(cacheKey);
        if (cache) mostrarEstaciones(JSON.parse(cache) as EstacionOCM[]);
      } catch { /* Si la cache está dañada, se ignora y se usa la API. */ }
      solicitud
        .then(({ data }) => {
          mostrarEstaciones(data, true);
        })
        .catch((e: Error) => {
          console.error('Error cargando estaciones:', e);
        });
    };

    cargarEstaciones();
    const actualizarMapa = () => cargarEstaciones();
    const actualizarMapaStorage = (evento: StorageEvent) => {
      if (evento.key === 'ev-charge:estaciones-actualizadas') cargarEstaciones();
    };
    window.addEventListener('ev-charge:estaciones-actualizadas', actualizarMapa);
    window.addEventListener('storage', actualizarMapaStorage);

    return () => {
      window.removeEventListener('ev-charge:estaciones-actualizadas', actualizarMapa);
      window.removeEventListener('storage', actualizarMapaStorage);
      map.remove();
      mapRef.current = null;
    };
  }, [usuario?.is_admin]);

  useEffect(() => {
    if (!estaciones.length) return;
    let cancelado = false;
    const cargarEstados = () => {
      Promise.all(estaciones.map(async (estacion) => {
        const id = String(estacion.ID);
        try {
          const estado = await obtenerEstadoEstacion(id);
          return [id, { estado: String(estado.estado || 'disponible'), cargadores_reservados: estado.cargadores_reservados }] as const;
        } catch {
          return [id, { estado: 'disponible' }] as const;
        }
      })).then((resultados) => {
        if (!cancelado) setEstadosEstaciones(Object.fromEntries(resultados));
      });
    };
    cargarEstados();
    const intervalo = window.setInterval(cargarEstados, 15000);
    const actualizarEstado = () => cargarEstados();
    const actualizarEstadoStorage = (evento: StorageEvent) => {
      if (evento.key === 'ev-charge:estaciones-actualizadas') cargarEstados();
    };
    window.addEventListener('ev-charge:estaciones-actualizadas', actualizarEstado);
    window.addEventListener('storage', actualizarEstadoStorage);
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
      window.removeEventListener('ev-charge:estaciones-actualizadas', actualizarEstado);
      window.removeEventListener('storage', actualizarEstadoStorage);
    };
  }, [estaciones]);

  // Recalcula los marcadores visibles cuando cambian las estaciones o el filtro.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    marcadoresRef.current.forEach((m) => map.removeLayer(m));
    marcadoresRef.current = [];

    const vehiculoActivo = vehiculosUsuario.find((vehiculo) => vehiculo.id === vehiculoFiltroId);
    const estacionesPorVehiculo = vehiculoActivo
      ? estaciones.filter((st) => (st.Connections || []).some((conector) =>
          (conector.ConnectionType?.Title || '').toLowerCase().includes(vehiculoActivo.tipo_conector.toLowerCase()),
        ))
      : estaciones;
    const estacionesPorCiudad = filtroCiudad === 'TODAS'
      ? estacionesPorVehiculo
      : estacionesPorVehiculo.filter((st) => ciudadCanonica(st.ciudad || st.City || st.AddressInfo?.Town) === filtroCiudad);
    const estacionesPorDepartamento = filtroDepartamento === 'TODOS'
      ? estacionesPorCiudad
      : estacionesPorCiudad.filter((st) => departamentoCanonico(st.departamento || st.StateOrProvince || st.AddressInfo?.StateOrProvince) === filtroDepartamento);
    const lista = filtro === 'TODOS'
      ? estacionesPorDepartamento
      : estacionesPorDepartamento.filter((st) =>
          (st.Connections || []).some((c) => (c.ConnectionType?.Title || '').toLowerCase().includes(filtro.toLowerCase())),
        );

    lista.forEach((st) => {
      if (!st.AddressInfo) return;
      const id = String(st.ID);
      const estadoInfo = estadosEstaciones[id] || { estado: 'disponible' };
      const conexionesCompatibles = (st.Connections || []).filter((conector) => {
        const tipo = (conector.ConnectionType?.Title || '').toLowerCase();
        const porFiltro = filtro === 'TODOS' || tipo.includes(filtro.toLowerCase());
        const vehiculoActivo = vehiculosUsuario.find((vehiculo) => vehiculo.id === vehiculoFiltroId);
        const porVehiculo = !vehiculoActivo || tipo.includes(vehiculoActivo.tipo_conector.toLowerCase());
        return porFiltro && porVehiculo;
      });
      const idsCargadoresCompatibles = conexionesCompatibles.map((conector) => `${id}-${(st.Connections || []).indexOf(conector) + 1}`);
      const todosCompatiblesReservados = idsCargadoresCompatibles.length > 0 && idsCargadoresCompatibles.every((cargadorId) => estadoInfo.cargadores_reservados?.includes(cargadorId));
      const estado = estadoInfo.estado === 'disponible' && todosCompatiblesReservados ? 'reservada' : estadoInfo.estado;
      const marker = L.marker([st.AddressInfo.Latitude, st.AddressInfo.Longitude], { icon: crearIconoEstacion(estado) }).addTo(map);
      marker.bindTooltip(st.AddressInfo.Title || `Estación ${id}`, { direction: 'top', offset: [0, -12] });
      marker.on('click', () => {
        marcadoresRef.current.forEach((m) => {
          const markerEstado = (m as L.Marker & { estadoEstacion?: string }).estadoEstacion || 'disponible';
          m.setIcon(crearIconoEstacion(markerEstado));
        });
        marker.setIcon(crearIconoEstacion(estado, true));
        setEstacionSeleccionada(st);
        setInfoRuta(null);
      });
      (marker as L.Marker & { estadoEstacion?: string }).estadoEstacion = estado;
      marcadoresRef.current.push(marker);
    });
  }, [estaciones, estadosEstaciones, filtro, filtroCiudad, filtroDepartamento, vehiculosUsuario, vehiculoFiltroId]);

  const ciudadesDisponibles = Array.from(new Map(
    estaciones
      .map((st) => ciudadCanonica(st.ciudad || st.City || st.AddressInfo?.Town))
      .filter(Boolean)
      .map((ciudad) => [ciudad, ciudad] as const),
  ).values()).sort();
  const departamentosDisponibles = Array.from(new Map(
    estaciones
      .map((st) => departamentoCanonico(st.departamento || st.StateOrProvince || st.AddressInfo?.StateOrProvince))
      .filter(Boolean)
      .map((departamento) => [departamento, departamento] as const),
  ).values()).sort();

  const calcularRuta = (destLat: number, destLon: number) => {
    if (!navigator.geolocation) return notificar({ tipo: 'error', titulo: 'Ubicación', mensaje: 'Este dispositivo no tiene GPS disponible.' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const map = mapRef.current;
        if (!map) return;
        const { latitude: uLat, longitude: uLon } = pos.coords;

        if (rutaCapaRef.current) map.removeLayer(rutaCapaRef.current);
        if (usuarioMarcadorRef.current) map.removeLayer(usuarioMarcadorRef.current);
        usuarioMarcadorRef.current = L.marker([uLat, uLon]).addTo(map).bindPopup('<i class="fa-solid fa-location-dot"></i> Estás aquí').openPopup();

        setCargandoRuta(true);
        try {
          const plan = await planificarViaje(uLat, uLon, destLat, destLon, 300);

          // Mostrar la ruta en el mapa
          const capa = L.geoJSON(plan.geometry as GeoJSON.GeoJsonObject, {
            style: { color: '#1769ff', weight: 7, opacity: 0.95 },
          }).addTo(map);
          rutaCapaRef.current = capa;
          rutaCoordsRef.current = plan.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
          destinoRutaRef.current = [destLat, destLon];
          instruccionesRef.current = (plan.instrucciones || []).map((paso) => ({ nombre: paso.nombre, modificador: paso.modificador, distancia_m: paso.distancia_m }));
          map.fitBounds(capa.getBounds(), { padding: [50, 50] });

          let infoTexto = `Distancia: ${plan.distancia_total_km} km · Tiempo: ${plan.duracion_min} min`;
          if (plan.paradas_sugeridas > 0) {
            infoTexto += ` · ${plan.paradas_sugeridas} parada(s) sugerida(s)`;
          }

          setInfoRuta(infoTexto);
          setDistanciaRestante(distanciaKm([uLat, uLon], [destLat, destLon]));
          iniciarNavegacion();
        } catch {
          notificar({ tipo: 'error', titulo: 'Ruta', mensaje: 'No se pudo calcular la ruta. Verifica que el backend esté activo.' });
        } finally {
          setCargandoRuta(false);
        }
      },
      (error) => notificar({ tipo: 'warning', titulo: 'Ubicación', mensaje: error.code === error.PERMISSION_DENIED ? 'Permiso de ubicación denegado. Actívalo en el navegador para usar el GPS.' : 'No se pudo obtener una ubicación precisa.' }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  };

  const nombreCompleto = usuario ? (usuario.apellido ? `${usuario.nombre} ${usuario.apellido}` : usuario.nombre) : '';
  const filtrosActivos = [filtro !== 'TODOS', filtroCiudad !== 'TODAS', filtroDepartamento !== 'TODOS', Boolean(vehiculoFiltroId)].filter(Boolean).length;

  return (
    <>
      {/* TOPBAR */}
      <div id="topbar">
        <div className="topbar-left">
          <Link to="/" className="topbar-back"><i className="fa-solid fa-arrow-left"></i> Inicio</Link>
          <button className="menu-toggle" aria-label="Abrir menú" onClick={() => setDrawerOpen(true)}>
            <i className="fa-solid fa-bars"></i>
          </button>
        </div>
        <div className="topbar-center">
          <Link to="/" className="topbar-logo"><img src="/img/logo.png" alt="EV Charge" /><span className="topbar-project-name">EV CHARGE</span></Link>
        </div>
        <div className="topbar-right">
          <div className="map-filters-wrap">
            <button className={`map-filters-button${filtrosActivos ? ' has-active' : ''}`} type="button" onClick={() => setFiltrosAbiertos((abierto) => !abierto)} aria-expanded={filtrosAbiertos}>
              <i className="fa-solid fa-sliders"></i> Filtros{filtrosActivos > 0 && <span className="filter-count">{filtrosActivos}</span>}
            </button>
            {filtrosAbiertos && <div className="map-filters-panel">
              <div className="map-filters-header"><strong>Filtrar estaciones</strong><button type="button" className="map-filters-close" onClick={() => setFiltrosAbiertos(false)} aria-label="Cerrar filtros">×</button></div>
              <label>Tipo de conector<select className="filter-select" title="Filtrar por tipo de conector" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="TODOS">Todos los conectores</option><option value="CCS">CCS</option><option value="Type 2">Type 2</option><option value="CHAdeMO">CHAdeMO</option><option value="GB/T">GB/T</option><option value="J1772">J1772</option>
              </select></label>
              <label>Ciudad<select className="filter-select" title="Filtrar por ciudad" value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                <option value="TODAS">Todas las ciudades</option>{ciudadesDisponibles.map((ciudad) => <option key={ciudad} value={ciudad}>{ciudad}</option>)}
              </select></label>
              <label>Departamento<select className="filter-select" title="Filtrar por departamento" value={filtroDepartamento} onChange={(e) => setFiltroDepartamento(e.target.value)}>
                <option value="TODOS">Todos los departamentos</option>{departamentosDisponibles.map((departamento) => <option key={departamento} value={departamento}>{departamento}</option>)}
              </select></label>
              {usuario && !usuario.is_admin && vehiculosUsuario.length > 0 && <label>Vehículo<select className="filter-select" title="Filtrar estaciones por vehículo" value={vehiculoFiltroId} onChange={(e) => setVehiculoFiltroId(e.target.value)}><option value="">Todos los vehículos</option>{vehiculosUsuario.map((vehiculo) => <option key={vehiculo.id} value={vehiculo.id}>{vehiculo.marca} {vehiculo.modelo} · {vehiculo.tipo_conector}</option>)}</select></label>}
              {filtrosActivos > 0 && <button type="button" className="map-filters-clear" onClick={() => { setFiltro('TODOS'); setFiltroCiudad('TODAS'); setFiltroDepartamento('TODOS'); setVehiculoFiltroId(''); }}>Limpiar filtros</button>}
            </div>}
          </div>
          {usuario ? (
            <>
              <span style={{ fontSize: 13, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{nombreCompleto}</span>
                <span
                  style={{
                    background: usuario.is_admin ? 'rgba(57,169,0,0.15)' : 'rgba(255,255,255,0.05)',
                    color: usuario.is_admin ? '#39a900' : '#999',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {usuario.is_admin ? 'Admin' : 'Usuario'}
                </span>
              </span>
              <button className="btn-topbar-logout" onClick={cerrarSesion}>Salir</button>
            </>
          ) : (
            <>
              <button className="btn-topbar-login" onClick={() => abrirAuthModal('login')}>Iniciar sesión</button>
              <button className="btn-topbar-registro" onClick={() => abrirAuthModal('registro')}>Registrarse</button>
            </>
          )}
        </div>
      </div>

      {/* MAPA + PANEL LATERAL */}
      <div id="map-wrapper">
        <div id="map" ref={mapDivRef}></div>
        <div id="panel-lateral">
          <div className="panel-scroll">
            <div className="panel-card welcome-card">
              <div className="welcome-icon"><i className="fa-solid fa-map"></i></div>
              <h2 className="welcome-title">Explora el mapa de EV Charge</h2>
              <p className="welcome-text">
                Utiliza el mapa para localizar estaciones de carga, consultar información y encontrar la mejor opción para tu próximo recorrido.
              </p>
            </div>
            <div className="panel-card steps-card">
              <h3 className="card-title">¿Cómo utilizar el mapa?</h3>
              <div className="steps-grid">
                {[
                  ['fa-location-dot', 'Explora el mapa'],
                  ['fa-bolt', 'Selecciona una estación'],
                  ['fa-plug', 'Usa los filtros'],
                  ['fa-calendar-days', 'Realiza una reserva'],
                  ['fa-compass', 'Planifica tu recorrido'],
                ].map(([icon, label]) => (
                  <div className="step-item" key={label}>
                    <span className="step-icon"><i className={`fa-solid ${icon}`}></i></span>
                    <span className="step-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel-card tips-card">
              <h3 className="card-title"><i className="fa-solid fa-lightbulb"></i> Consejos para una mejor experiencia</h3>
              <ul className="tips-list">
                <li>Activa tu ubicación para encontrar estaciones cercanas.</li>
                <li>Revisa el tipo de conector antes de seleccionar una estación.</li>
                <li>Consulta la disponibilidad antes de realizar una reserva.</li>
                <li>Utiliza el zoom del mapa para visualizar más estaciones.</li>
                <li>Explora diferentes zonas para encontrar la opción que mejor se adapte a tu recorrido.</li>
              </ul>
            </div>
            <div className="panel-card map-legend-card">
              <h3 className="card-title">Estado de las estaciones</h3>
              <p><span style={{ color: '#39a900' }}>●</span> Disponible</p>
              <p><span style={{ color: '#3498db' }}>●</span> Reservada</p>
              <p><span style={{ color: '#f39c12' }}>●</span> En mantenimiento</p>
              <p><span style={{ color: '#e74c3c' }}>●</span> Fuera de servicio</p>
            </div>
          </div>
        </div>

        <div id="estacion-detalle" className={`estacion-detalle${estacionSeleccionada ? ' open' : ''}`}>
          <button className="close-detalle" onClick={() => setEstacionSeleccionada(null)}><i className="fa-solid fa-xmark"></i></button>
          <div id="detalle-contenido">
            {estacionSeleccionada && (
              <EstacionDetalle
                estacion={estacionSeleccionada}
                usuario={usuario}
                onLoginRequerido={() => abrirAuthModal('login')}
                onCalcularRuta={calcularRuta}
                onClose={() => setEstacionSeleccionada(null)}
                filtroConector={filtro}
                tipoConectorVehiculo={vehiculosUsuario.find((vehiculo) => vehiculo.id === vehiculoFiltroId)?.tipo_conector || ''}
              />
            )}
            {infoRuta && (
              <div style={{ margin: '8px 0', padding: 8, background: '#1a1a1a', borderRadius: 6, border: '2px solid #39a900', color: '#39a900', fontSize: 13, fontWeight: 600 }}>
                <i className="fa-solid fa-car"></i> {infoRuta}
                {navegando && <div style={{ marginTop: 6, color: '#fff' }}>Navegación activa · {distanciaRestante === null ? 'calculando distancia' : `${distanciaRestante.toFixed(1)} km restantes`}</div>}
                {proximaInstruccion && <div style={{ marginTop: 4, color: '#ddd' }}><i className="fa-solid fa-signs-post"></i> {proximaInstruccion}</div>}
                {desvioRuta && <div style={{ marginTop: 4, color: '#f39c12' }}>Te alejaste de la ruta. Se recomienda recalcular.</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="btn-tbl" onClick={iniciarSimulacion}>{simulandoNavegacion ? 'Prueba activa' : 'Probar simulación'}</button>
                  {navegando && <button className="btn-tbl" onClick={() => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; setNavegando(false); setNavegacionPausada(true); }}>Pausar</button>}
                  {navegacionPausada && <button className="btn-tbl" onClick={iniciarNavegacion}>Continuar</button>}
                  {(navegando || navegacionPausada) && <button className="btn-tbl danger" onClick={() => detenerNavegacion(false)}>Finalizar navegación</button>}
                </div>
              </div>
            )}
            {cargandoRuta && (
              <div style={{ margin: '8px 0', padding: 8, background: '#1a1a1a', borderRadius: 6, border: '2px solid #f39c12', color: '#f39c12', fontSize: 13, textAlign: 'center' }}>
                <i className="fa-solid fa-spinner fa-spin"></i> Calculando ruta...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DRAWER — MENÚ ADAPTATIVO */}
      <div className={`drawer-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)}></div>
      <div className={`drawer${drawerOpen ? ' open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-avatar">{usuario ? usuario.nombre.charAt(0).toUpperCase() : <i className="fa-solid fa-user"></i>}</div>
          <div className="drawer-user-info">
            <div className="drawer-user-name">{usuario ? nombreCompleto : 'Invitado'}</div>
            <div className="drawer-user-email">{usuario ? usuario.email : 'Inicia sesión para acceder a todas las funciones de EV Charge.'}</div>
            <div className="drawer-user-role" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {usuario ? (usuario.is_admin ? 'Administrador' : 'Usuario') : '—'}
            </div>
          </div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <nav className="drawer-nav">
          {!usuario ? (
            <>
              <Link className="anav" to="/" onClick={() => setDrawerOpen(false)}><span className="icon"><i className="fa-solid fa-house"></i></span> Inicio</Link>
              <a className="anav" href="#" onClick={(e) => { e.preventDefault(); setDrawerOpen(false); abrirAuthModal('login'); }}><span className="icon"><i className="fa-solid fa-key"></i></span> Iniciar sesión</a>
              <a className="anav" href="#" onClick={(e) => { e.preventDefault(); setDrawerOpen(false); abrirAuthModal('registro'); }}><span className="icon"><i className="fa-solid fa-user-plus"></i></span> Registrarse</a>
            </>
          ) : usuario.is_admin ? (
            <>
              <Link className="anav" to="/admin" onClick={() => setDrawerOpen(false)}><span className="icon"><i className="fa-solid fa-chart-simple"></i></span> Panel admin</Link>
              <a className="anav danger" href="#" onClick={(e) => { e.preventDefault(); setDrawerOpen(false); cerrarSesion(); }}><span className="icon"><i className="fa-solid fa-right-from-bracket"></i></span> Cerrar sesión</a>
            </>
          ) : (
            <>
              <Link className="anav" to="/dashboard" onClick={() => setDrawerOpen(false)}><span className="icon"><i className="fa-solid fa-house"></i></span> Mi dashboard</Link>
              <a className="anav danger" href="#" onClick={(e) => { e.preventDefault(); setDrawerOpen(false); cerrarSesion(); }}><span className="icon"><i className="fa-solid fa-right-from-bracket"></i></span> Cerrar sesión</a>
            </>
          )}
        </nav>
      </div>

      {authModalOpen && <AuthModal initialTab={authTab} onClose={() => setAuthModalOpen(false)} />}
    </>
  );
}
