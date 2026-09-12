import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './styles.css';
import { login, registro, obtenerPerfil, logout as logoutApi, ApiError, type Usuario } from './api/auth.api';
import { listarNotificaciones, marcarNotificacionesLeidas, type Notificacion } from './api/notificaciones.api';
import { enviarContacto as enviarContactoApi } from './api/contacto.api';
import { ModalPago } from './components/ModalPago';
import { listarMetodosPago, type MetodoPago } from './api/metodosPago.api';
import { notificar } from './components/GlobalNotifications';
import { OlvidarContrasena } from './components/OlvidarContrasena';

type AuthTab = 'login' | 'registro' | 'recuperar';
type AlertType = 'error' | 'success';
type ThemeMode = 'dark' | 'light' | 'system';

const iconoNotificacion = (tipo: Notificacion['tipo']) => ({
  vehiculo: 'fa-car',
  reserva: 'fa-calendar-check',
  compra: 'fa-bag-shopping',
  pago: 'fa-credit-card',
  reporte: 'fa-triangle-exclamation',
  favorito: 'fa-star',
  calificacion: 'fa-star-half-stroke',
  sistema: 'fa-bolt',
}[tipo] || 'fa-bell');

// Componente visual de simulación de reCAPTCHA
const SimulatedCaptcha = ({ onVerify, refreshKey }: { onVerify: (v: boolean) => void; refreshKey: number }) => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setChecked(false);
    setLoading(false);
    onVerify(false);
  }, [refreshKey, onVerify]);

  const handleClick = () => {
    if (checked || loading) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setChecked(true);
      onVerify(true);
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', margin: '14px 0', background: '#f9f9f9', border: '1px solid #d3d3d3', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: checked ? 'default' : 'pointer' }} onClick={handleClick}>
        <div style={{ width: '26px', height: '26px', border: checked ? 'none' : '2px solid #c1c1c1', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
          {loading ? (
            <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#555', fontSize: '14px' }}></i>
          ) : checked ? (
            <span style={{ color: '#0f9d58', fontSize: '22px', fontWeight: 'bold' }}>✓</span>
          ) : null}
        </div>
        <span style={{ fontSize: '14px', color: '#555', fontWeight: 500 }}>No soy un robot</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" style={{ width: '24px' }} />
        <span style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>reCAPTCHA</span>
      </div>
    </div>
  );
};

type CategoriaKey = 'Cargadores' | 'Llantas' | 'Baterías' | 'Cables y conectores';
type ProductoCompra = { nombre: string; desc: string; precio: string; monto: number; img: string };
type ProductoCatalogo = ProductoCompra & { categoria: CategoriaKey; etiqueta: string; tipo: string; potencia: string; conector: string };

const preguntasFrecuentes = [
  { pregunta: '¿Qué es EV Charge?', respuesta: 'Es una plataforma para encontrar estaciones de carga, revisar sus cargadores y organizar la recarga de tu vehículo eléctrico.' },
  { pregunta: '¿Cómo encuentro un cargador compatible?', respuesta: 'Registra tu vehículo y usa el filtro correspondiente. El mapa resaltará los cargadores que coinciden con el tipo de conector de tu vehículo.' },
  { pregunta: '¿Cómo hago una reserva?', respuesta: 'Abre el mapa, selecciona una estación y el cargador compatible. Después elige la fecha, la hora y la duración de la recarga.' },
  { pregunta: '¿Puedo ver el precio antes de reservar?', respuesta: 'Sí. En la información del cargador puedes cambiar la duración y consultar el valor estimado antes de confirmar.' },
  { pregunta: '¿Qué significan los colores de las estaciones?', respuesta: 'Verde significa que hay disponibilidad, rojo indica mantenimiento o fuera de servicio y azul indica que todos los cargadores están reservados.' },
  { pregunta: '¿Qué hago si encuentro un problema?', respuesta: 'Puedes reportarlo desde la información de la estación. También puedes calificarla y revisar los reportes de otros usuarios.' },
];

const productosPorCategoria: Record<CategoriaKey, ProductoCompra[]> = {
  'Cargadores': [
    { nombre: 'Cargador Rápido DC 150 kW', desc: 'Ideal para estaciones comerciales de carga ultra rápida.', precio: '$8.500.000 COP', monto: 8500000, img: '/img/cargador-rapido-150kw.png' },
    { nombre: 'Wallbox Inteligente 22 kW', desc: 'La solución compacta perfecta para tu casa o garaje.', precio: '$3.500.000 COP', monto: 3500000, img: '/img/wallbox-22kw.png' },
    { nombre: 'Cargador Portátil 7.4 kW', desc: 'Llévalo contigo en el baúl a todas partes.', precio: '$1.200.000 COP', monto: 1200000, img: '/img/cargador-portatil-74kw.png' }
  ],
  'Llantas': [
    { nombre: 'Llanta Michelin Pilot Sport EV 20"', desc: 'Alto rendimiento, bajo ruido y diseñada para el torque eléctrico.', precio: '$1.250.000 COP', monto: 1250000, img: '/img/producto-llanta.svg' },
    { nombre: 'Llanta Hankook iON evo 22"', desc: 'Optimiza la autonomía de la batería con menor resistencia a la rodadura.', precio: '$1.480.000 COP', monto: 1480000, img: '/img/producto-llanta.svg' }
  ],
  'Baterías': [
    { nombre: 'Módulo de Batería 48V', desc: 'Repuesto original de celdas de iones de litio de alta densidad.', precio: '$2.800.000 COP', monto: 2800000, img: '/img/producto-bateria.svg' },
    { nombre: 'Batería Auxiliar 12V EV', desc: 'Soporte para los sistemas electrónicos y pantalla del vehículo.', precio: '$450.000 COP', monto: 450000, img: '/img/producto-bateria.svg' }
  ],
  'Cables y conectores': [
    { nombre: 'Cable Tipo 2 a Tipo 2 (5m)', desc: 'Soporta carga trifásica de hasta 22kW.', precio: '$480.000 COP', monto: 480000, img: '/img/producto-cable.svg' },
    { nombre: 'Adaptador CCS2 a GB/T', desc: 'Compatibilidad total con el estándar de carga chino.', precio: '$750.000 COP', monto: 750000, img: '/img/producto-cable.svg' }
  ]
};

const catalogoProductos: ProductoCatalogo[] = [
  { ...productosPorCategoria.Cargadores[0], categoria: 'Cargadores', etiqueta: 'Carga rápida', tipo: 'CARGADOR DC', potencia: '150 kW', conector: 'CCS2' },
  { ...productosPorCategoria.Cargadores[1], categoria: 'Cargadores', etiqueta: 'Uso residencial', tipo: 'WALLBOX', potencia: '22 kW', conector: 'Tipo 2' },
  { ...productosPorCategoria.Cargadores[2], categoria: 'Cargadores', etiqueta: 'Portátil', tipo: 'CARGADOR PORTÁTIL', potencia: '7,4 kW', conector: 'Tipo 2' },
  { ...productosPorCategoria.Llantas[0], categoria: 'Llantas', etiqueta: 'Rendimiento', tipo: 'LLANTAS EV', potencia: '20 pulgadas', conector: 'Vehículos eléctricos' },
  { ...productosPorCategoria.Llantas[1], categoria: 'Llantas', etiqueta: 'Eficiencia', tipo: 'LLANTAS EV', potencia: '22 pulgadas', conector: 'Vehículos eléctricos' },
  { ...productosPorCategoria.Baterías[0], categoria: 'Baterías', etiqueta: 'Alto rendimiento', tipo: 'BATERÍA EV', potencia: '48 V', conector: 'Iones de litio' },
  { ...productosPorCategoria.Baterías[1], categoria: 'Baterías', etiqueta: 'Auxiliar', tipo: 'BATERÍA EV', potencia: '12 V', conector: 'Auxiliar' },
  { ...productosPorCategoria['Cables y conectores'][0], categoria: 'Cables y conectores', etiqueta: 'Carga segura', tipo: 'CABLE', potencia: '22 kW', conector: 'Tipo 2' },
  { ...productosPorCategoria['Cables y conectores'][1], categoria: 'Cables y conectores', etiqueta: 'Adaptador', tipo: 'ADAPTADOR', potencia: 'CCS2', conector: 'GB/T' },
];

function App() {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [alert, setAlert] = useState<{ message: string; type: AlertType } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaSolved, setCaptchaSolved] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);

  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPassConfirm, setRegPassConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactForm, setContactForm] = useState({ nombre: '', apellido: '', correo: '', mensaje: '' });
  const [preguntaAbierta, setPreguntaAbierta] = useState<number | null>(null);
  const [year] = useState(() => new Date().getFullYear());
  
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [productoCompra, setProductoCompra] = useState<ProductoCompra | null>(null);
  const [productoDetalle, setProductoDetalle] = useState<ProductoCatalogo | null>(null);
  const [metodosPagoCompra, setMetodosPagoCompra] = useState<MetodoPago[]>([]);

  const unreadCount = notificaciones.filter(n => !n.leida).length;
  const [recordarme, setRecordarme] = useState(localStorage.getItem('ev_remember') === 'true');

  const marcarComoLeidas = async () => {
    setNotificaciones((prev) => prev.map((notificacion) => ({ ...notificacion, leida: true })));
    try {
      await marcarNotificacionesLeidas();
    } catch {
      // El estado visual ya queda actualizado; se volverá a sincronizar al recargar.
    }
  };

  const fechaNotificacion = (value: string) => {
    const diferencia = Date.now() - new Date(value).getTime();
    const minutos = Math.max(0, Math.floor(diferencia / 60000));
    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
  };

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaKey | null>(null);
  const [productoBusqueda, setProductoBusqueda] = useState('');
  const [productoOrden, setProductoOrden] = useState<'relevancia' | 'precio-menor' | 'precio-mayor' | 'nombre'>('relevancia');
  const [productoCategoria, setProductoCategoria] = useState<'Todas' | CategoriaKey>('Todas');

  const [errorSistema, setErrorSistema] = useState<{ visible: boolean; mensaje: string }>({
    visible: false,
    mensaje: '',
  });

  const [themeMode, setThemeMode] = useState<ThemeMode>(
    () => (localStorage.getItem('ev_theme') as ThemeMode) || 'system'
  );

  const productosVisibles = useMemo(() => {
    const busqueda = productoBusqueda.trim().toLowerCase();
    const filtrados = catalogoProductos.filter((producto) => {
      const coincideCategoria = productoCategoria === 'Todas' || producto.categoria === productoCategoria;
      const coincideBusqueda = !busqueda || [producto.nombre, producto.desc, producto.categoria, producto.tipo, producto.conector].some((valor) => valor.toLowerCase().includes(busqueda));
      return coincideCategoria && coincideBusqueda;
    });
    return [...filtrados].sort((a, b) => {
      if (productoOrden === 'precio-menor') return a.monto - b.monto;
      if (productoOrden === 'precio-mayor') return b.monto - a.monto;
      if (productoOrden === 'nombre') return a.nombre.localeCompare(b.nombre, 'es');
      return 0;
    });
  }, [productoBusqueda, productoOrden, productoCategoria]);

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

  const requirements = useMemo(() => ({
    min: regPass.length >= 8,
    may: /[A-Z]/.test(regPass),
    low: /[a-z]/.test(regPass),
    num: /\d/.test(regPass),
    sim: /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(regPass),
    same: regPass === regPassConfirm && regPass !== '',
  }), [regPass, regPassConfirm]);

  const score = Object.values(requirements).filter(Boolean).length;
  const passwordComplete = score === 6;
  const passwordPercent = (score / 6) * 100;

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.section'));
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav-link'));
    const navbar = document.getElementById('navbar');

    const observerNav = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((link) => link.classList.remove('active'));
          document.querySelector(`.nav-link[href="#${entry.target.id}"]`)?.classList.add('active');
        }
      });
    }, { threshold: 0.4 });

    sections.forEach((section) => observerNav.observe(section));

    const observerReveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observerReveal.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach((element) => observerReveal.observe(element));

    const onScroll = () => navbar?.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll);

    return () => {
      observerNav.disconnect();
      observerReveal.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setNotificaciones([]);
      return;
    }
    listarNotificaciones().then(setNotificaciones).catch(() => setNotificaciones([]));
  }, [currentUser]);

  useEffect(() => {
    const token = localStorage.getItem('ev_token');
    if (!token) return;

    obtenerPerfil()
      .then((data) => setCurrentUser(data.usuario))
      .catch(() => {
        localStorage.removeItem('ev_token');
        setCurrentUser(null);
      });
  }, []);

  // Cargar email guardado si "Recordarme" está habilitado
  useEffect(() => {
    const remember = localStorage.getItem('ev_remember') === 'true';
    const savedEmail = localStorage.getItem('ev_remember_email');
    if (remember && savedEmail) {
      setLoginEmail(savedEmail);
      setRecordarme(true);
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = (authModalOpen || categoriaSeleccionada || productoDetalle || errorSistema.visible) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [authModalOpen, categoriaSeleccionada, productoDetalle, errorSistema.visible]);

  const openAuthModal = (tab: AuthTab) => {
    setAuthTab(tab);
    setAlert(null);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAlert(null);
  };

  const switchAuthTab = (tab: AuthTab) => {
    setAuthTab(tab);
    setAlert(null);
  };

  const smoothTo = (id: string, event?: MouseEvent<HTMLAnchorElement | HTMLDivElement | HTMLButtonElement>) => {
    event?.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  const iniciarCompra = async (producto: ProductoCompra) => {
    if (!currentUser) {
      setCategoriaSeleccionada(null);
      openAuthModal('login');
      setAlert({ message: 'Inicia sesión para continuar con la compra.', type: 'error' });
      return;
    }
    try {
      const metodos = await listarMetodosPago();
      setMetodosPagoCompra(metodos);
      setCategoriaSeleccionada(null);
      setProductoCompra(producto);
    } catch {
      setAlert({ message: 'No se pudieron cargar tus métodos de pago.', type: 'error' });
    }
  };

  const cerrarCompra = () => setProductoCompra(null);

  const enviarContacto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await enviarContactoApi(contactForm);
      setContactSent(true);
      setContactForm({ nombre: '', apellido: '', correo: '', mensaje: '' });
      window.setTimeout(() => setContactSent(false), 5000);
    } catch (error) {
      setAlert({ message: error instanceof Error ? error.message : 'No se pudo enviar el mensaje.', type: 'error' });
    }
  };

  const doLogin = async (event?: FormEvent) => {
    event?.preventDefault();
    
    // Validación de campos vacíos
    const email = loginEmail.trim();
    const pass = loginPass;
    
    if (!email || !pass) {
      setAlert({ message: ' Por favor, completa el correo y la contraseña', type: 'error' });
      return;
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAlert({ message: ' Por favor, ingresa un correo válido (ejemplo@correo.com)', type: 'error' });
      return;
    }

    if (captchaRequired && !captchaSolved) {
      setAlert({ message: ' Por favor, verifica que no eres un robot.', type: 'error' });
      return;
    }

    setAuthLoading(true);
    setAlert(null);
    try {
      const data = await login(email, pass);
      
      // Guardar preferencia de "Recordarme"
      if (recordarme) {
        localStorage.setItem('ev_remember', 'true');
        localStorage.setItem('ev_remember_email', email);
      } else {
        localStorage.removeItem('ev_remember');
        localStorage.removeItem('ev_remember_email');
      }
      
      closeAuthModal();
      window.location.href = data.usuario.is_admin ? '/admin' : '/dashboard';
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error?.message || error?.detail || '');
      const errorStatus = error instanceof ApiError ? error.status : error?.status ?? error?.response?.status ?? error?.response?.data?.status;

      if (errorMsg === 'captcha_required') {
        setCaptchaRequired(true);
        setCaptchaSolved(false);
        setCaptchaKey((prev) => prev  + 1);
        setAlert({ message: 'Demasiados intentos. Verifica que no eres un robot.', type: 'error' });
      } else if (errorMsg.includes('minutos')) {
        setCaptchaRequired(false);
        setAlert({ message: `${errorMsg}`, type: 'error' });
      } else if (Number(errorStatus) === 401 || Number(errorStatus) === 400 || Number(errorStatus) === 422 || /credenciales|contraseña|correo incorrectos|invalid credentials/i.test(errorMsg)) {
        setAlert({ message: 'Correo o contraseña incorrectos', type: 'error' });
        if (captchaRequired) {
          setCaptchaSolved(false);
          setCaptchaKey((prev) => prev + 1);
        }
      } else {
        setAlert({ message: 'No se pudo iniciar sesión. Verifica que el backend esté activo.', type: 'error' });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const doRegistro = async (event?: FormEvent) => {
    event?.preventDefault();
    const nombre = regNombre.trim();
    const apellido = regApellido.trim();
    const email = regEmail.trim();
    const pass = regPass;

    if (!nombre || !apellido || !email || !pass || !regPassConfirm) {
      setAlert({ message: '⚠️ Por favor, digite todos los datos solicitados.', type: 'error' });
      return;
    }
    if (!passwordComplete) {
      setAlert({ message: '⚠️ Tu contraseña no cumple todos los requisitos.', type: 'error' });
      return;
    }

    setAuthLoading(true);
    setAlert(null);
    try {
      await registro(nombre, apellido, email, pass);

      setAlert({ message: 'Cuenta creada correctamente. Ahora puedes iniciar sesión.', type: 'success' });
      setRegNombre('');
      setRegApellido('');
      setRegEmail('');
      setRegPass('');
      setRegPassConfirm('');
      setAuthTab('login');
      setLoginEmail(email);
      window.setTimeout(() => document.getElementById('login-pass')?.focus(), 0);
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error?.message || error?.detail || '');
      const errorStatus = error instanceof ApiError ? error.status : error?.status ?? error?.response?.status ?? error?.response?.data?.status;
      if ((Number(errorStatus) === 409) || /correo ya está registrado|correo ya existe/i.test(errorMsg)) {
        setAlert({ message: 'Este correo ya está registrado, intente con otro.', type: 'error' });
      } else if (Number(errorStatus) === 400 || Number(errorStatus) === 422) {
        setAlert({ message: errorMsg || 'Los datos del registro no son válidos.', type: 'error' });
      } else {
        setAlert({ message: 'No se pudo completar el registro. Verifica que el backend esté activo.', type: 'error' });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    logoutApi();
    setCurrentUser(null);
    window.location.reload();
  };

  const requirementsList = [
    ['min', 'Mínimo 8 caracteres'],
    ['may', 'Una mayúscula'],
    ['low', 'Una minúscula'],
    ['num', 'Un número'],
    ['sim', 'Un símbolo'],
    ['same', 'Las contraseñas coinciden'],
  ] as const;

  return (
    <>
      <nav id="navbar">
        <div className="nav-inner">
          <a className="nav-logo" href="#inicio">
            <img src="/img/logo.png" alt="EV Charge" />
          </a>
          <ul className={`nav-links${mobileMenuOpen ? ' open' : ''}`}>
            <li><a href="#inicio" className="nav-link active" onClick={() => setMobileMenuOpen(false)}>Inicio</a></li>
            <li><a href="#categoria" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Categoría</a></li>
            <li><a href="#servicios" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Servicios</a></li>
            <li><a href="#nosotros" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Quiénes somos</a></li>
            <li><a href="#cifras" className="nav-link" onClick={() => setMobileMenuOpen(false)}>En números</a></li>
            <li><a href="#contacto" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Contacto</a></li>
          </ul>

          {!currentUser ? (
            <div className="auth-actions" id="auth-actions">
              <button className="btn-nav-outline" onClick={() => openAuthModal('login')}>Iniciar sesión</button>
              <button className="btn-nav-outline" onClick={() => openAuthModal('registro')}>Registrarse</button>
            </div>
          ) : (
            <div className="user-greeting" id="user-greeting">
              <div className="notif-wrapper">
                <button 
                  className="notif-btn" 
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    if (!notifOpen && unreadCount > 0) void marcarComoLeidas();
                  }}
                  title="Notificaciones"
                >
                  <i className="fa-solid fa-bell"></i>
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </button>

                {notifOpen && (
                  <div className="notif-dropdown">
                    <div className="notif-header">
                      <h4>Notificaciones</h4>
                      <span className="notif-count">
                        {unreadCount > 0 ? `${unreadCount} nuevas` : 'Al día'}
                      </span>
                    </div>

                    <div className="notif-list">
                      {notificaciones.length === 0 ? (
                        <p className="notif-empty">No tienes notificaciones por el momento.</p>
                      ) : (
                        notificaciones.map((n) => (
                          <div key={n.id} className={`notif-item ${!n.leida ? 'unread' : ''}`}>
                            <div className={`notif-icon notif-${n.tipo}`}>
                              <i className={`fa-solid ${iconoNotificacion(n.tipo)}`}></i>
                            </div>
                            <div className="notif-content">
                              <div className="notif-title-row">
                                <h5>{n.titulo}</h5>
                                <span className="notif-time">{fechaNotificacion(n.created_at)}</span>
                              </div>
                              <p>{n.mensaje}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <span>Bienvenido, <span className="username" id="welcome-username">{currentUser.apellido ? `${currentUser.nombre} ${currentUser.apellido}` : currentUser.nombre}</span></span>
              <button className="btn-nav-outline-logout" onClick={logout}>Salir</button>
            </div>
          )}

          <Link className="btn-nav" to="/mapa">Abrir mapa <i className="fa-solid fa-location-dot"></i></Link>
          <button className="hamburger" id="hamburger" aria-label="Menú" onClick={() => setMobileMenuOpen((value) => !value)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      <div className="theme-floating-widget">
        <button className={`theme-btn ${themeMode === 'dark' ? 'active' : ''}`} onClick={() => setThemeMode('dark')} title="Modo Oscuro">
          <i className="fa-solid fa-moon"></i>
        </button>
        <button className={`theme-btn ${themeMode === 'light' ? 'active' : ''}`} onClick={() => setThemeMode('light')} title="Modo Claro">
          <i className="fa-solid fa-sun"></i>
        </button>
        <button className={`theme-btn ${themeMode === 'system' ? 'active' : ''}`} onClick={() => setThemeMode('system')} title="Tema del Sistema">
          <i className="fa-solid fa-desktop"></i>
        </button>
      </div>

      <section id="inicio" className="section hero-section">
        <div className="glow-orb orb1"></div>
        <div className="glow-orb orb2"></div>
        <div className="hero-content">
          <img src="/img/logo.png" alt="EVCHARGE" className="hero-logo" />
          <div className="hero-project-name">EVCHARGE</div>
          <p className="hero-eyebrow">Movilidad eléctrica · Colombia</p>
          <h1 className="hero-title">Carga donde<br /><span className="accent">necesitas,</span><br />cuando necesitas.</h1>
          <p className="hero-sub">Encuentra estaciones de carga compatibles con tu vehículo, traza rutas inteligentes y conecta con la comunidad EV de Bogotá.</p>
          <div className="hero-actions">
            <Link to="/mapa" className="btn-primary-lg"><span className="btn-icon"><i className="fa-solid fa-bolt"></i></span> Iniciar navegación</Link>
            <a href="#nosotros" className="btn-ghost-lg" onClick={(e) => smoothTo('nosotros', e)}>Conoce más</a>
          </div>
        </div>
        <div className="hero-scroll-hint" onClick={(e) => smoothTo('nosotros', e)}>
          <span>Desplázate</span><div className="scroll-arrow"></div>
        </div>
      </section>

      <section id="categoria" className="section categoria-section">
        <div className="section-inner">
          <div className="section-head reveal">
            <p className="eyebrow">Categorías</p>
            <h2>Encuentra lo que<br />necesitas para tu vehículo</h2>
            <p className="section-sub">Explora nuestras categorías de productos y soluciones para movilidad eléctrica.</p>
          </div>

          <div className="categoria-grid">
            <div className="categoria-card reveal" role="link" tabIndex={0} onClick={() => navigate('/productos?categoria=Cargadores')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate('/productos?categoria=Cargadores'); }}>
              <div className="categoria-img-box"><img src="/img/wallbox-22kw.png" alt="Cargadores" className="categoria-img" loading="lazy" decoding="async" /></div>
              <h3>Cargadores</h3>
              <p>Cargadores para vehículos eléctricos de diferentes potencias y necesidades.</p>
              <span className="categoria-action">Explorar categoría <i className="fa-solid fa-arrow-right"></i></span>
            </div>
            <div className="categoria-card reveal" role="link" tabIndex={0} onClick={() => navigate('/productos?categoria=Llantas')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate('/productos?categoria=Llantas'); }}>
              <div className="categoria-img-box"><img src="/img/producto-llanta.svg" alt="Llantas" className="categoria-img" loading="lazy" decoding="async" /></div>
              <h3>Llantas</h3>
              <p>Llantas diseñadas para ofrecer seguridad y rendimiento en tu vehículo eléctrico.</p>
              <span className="categoria-action">Explorar categoría <i className="fa-solid fa-arrow-right"></i></span>
            </div>
            <div className="categoria-card reveal" role="link" tabIndex={0} onClick={() => navigate('/productos?categoria=Baterías')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate('/productos?categoria=Baterías'); }}>
              <div className="categoria-img-box"><img src="/img/producto-bateria.svg" alt="Baterias" className="categoria-img" loading="lazy" decoding="async" /></div>
              <h3>Baterías</h3>
              <p>Soluciones de energía y baterías para mejorar la autonomía de tu vehículo.</p>
              <span className="categoria-action">Explorar categoría <i className="fa-solid fa-arrow-right"></i></span>
            </div>
            <div className="categoria-card reveal" role="link" tabIndex={0} onClick={() => navigate('/productos?categoria=Cables%20y%20conectores')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate('/productos?categoria=Cables%20y%20conectores'); }}>
              <div className="categoria-img-box"><img src="/img/producto-cable.svg" alt="Cables y Conectores" className="categoria-img" loading="lazy" decoding="async" /></div>
              <h3>Cables y conectores</h3>
              <p>Cables, conectores y accesorios para realizar tus cargas de forma segura.</p>
              <span className="categoria-action">Explorar categoría <i className="fa-solid fa-arrow-right"></i></span>
            </div>
          </div>
        </div>
      </section>

      <section id="servicios" className="section servicios-section">
        <div className="section-inner">
          <div className="section-head reveal"><p className="eyebrow">Lo que hacemos</p><h2>Todo lo que necesita<br />tu vehículo eléctrico</h2></div>
          <div className="services-grid">
            {[
              ['/img/seccion1.png', 'Mapa en tiempo real', 'Visualiza todas las estaciones de carga cerca de ti en Bogotá, con información actualizada.', 'fa-map-location-dot'],
              ['/img/seccion2.png', 'Filtro por tu vehículo', 'Registra tu auto y el sistema filtra automáticamente las estaciones compatibles.', 'fa-car-side'],
              ['/img/seccion3.png', 'Planificador de viaje', 'Calcula las paradas de recarga óptimas según tu autonomía usando rutas viales reales.', 'fa-compass'],
              ['/img/seccion4.png', 'Comunidad activa', 'Califica estaciones, reporta cargadores dañados y consulta la experiencia de otros conductores.', 'fa-star'],
              ['/img/seccion5.png', 'Historial de cargas', 'Lleva el registro de cada sesión: kWh cargados, costo estimado y estación utilizada.', 'fa-clipboard-list'],
              ['/img/seccion6.png', 'Reservas inteligentes', 'Programa tus recargas con anticipación, reserva estaciones disponibles y organiza tus viajes de forma eficiente.', 'fa-calendar-check'],
            ].map(([image, title, description, icon]) => (
              <div className="service-card reveal" key={title}>
                <div className="card-image"><img src={image} alt={title} loading="lazy" decoding="async" /></div>
                <div className="card-content"><h3><i className={`fa-solid ${icon} card-icon`}></i> {title}</h3><p>{description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="nosotros" className="section nosotros-section">
        <div className="nosotros-bg"><div className="banner-headline">EV CHARGE</div><div className="banner-spotlight"></div><div className="banner-diamond"></div><div className="banner-car-wrap"><img src="/img/ChatGPT Image 26 jun 2026, 08_44_00 a.m..png" className="banner-car-img" alt="EV Car with charger" loading="lazy" decoding="async" /></div></div>
        <div className="nosotros-content-wrapper"><div className="nosotros-content"><p className="nosotros-eyebrow reveal">Quiénes somos</p><h2 className="nosotros-title reveal">EV Charge</h2><p className="nosotros-desc reveal">Proyecto desarrollado por aprendices ADSO del SENA.</p><p className="nosotros-desc reveal">Impulsamos la movilidad eléctrica mediante una plataforma inteligente para localizar estaciones de carga, administrar vehículos, gestionar reservas y ofrecer una mejor experiencia a los conductores de vehículos eléctricos.</p><a href="#contacto" className="btn-primary-lg nosotros-btn reveal" onClick={(e) => smoothTo('contacto', e)}>Conoce más</a></div></div>
      </section>

      <section id="cifras" className="section cifras-section">
        <div className="section-inner"><div className="section-head reveal"><p className="eyebrow">En números</p><h2>La red eléctrica que ya existe</h2></div><div className="cifras-grid">
          {[['47', 'Estaciones en Bogotá'], ['20', 'km de radio cubierto'], ['5', 'Tipos de conector'], ['100%', '% open source']].map(([num, label]) => <div className="cifra-item reveal" key={label}><div className="cifra-num">{num}</div><div className="cifra-label">{label}</div></div>)}
        </div></div>
      </section>

      <section id="contacto" className="section contacto-section">
        <div className="section-inner contacto-inner"><div className="section-head reveal"><p className="eyebrow">Contacto</p><h2>¿Tienes una estación de carga<br />que quieras registrar?</h2><p className="section-sub">Escríbenos y la agregamos al mapa.</p></div>
          <form className="contacto-form reveal" onSubmit={enviarContacto}><div className="form-row"><div className="form-field"><label>Nombre</label><input type="text" placeholder="Tu nombre" required value={contactForm.nombre} onChange={(event) => setContactForm({ ...contactForm, nombre: event.target.value })} /></div><div className="form-field"><label>Apellido</label><input type="text" placeholder="Tu apellido" required value={contactForm.apellido} onChange={(event) => setContactForm({ ...contactForm, apellido: event.target.value })} /></div></div><div className="form-field"><label>Correo</label><input type="email" placeholder="correo@ejemplo.com" required value={contactForm.correo} onChange={(event) => setContactForm({ ...contactForm, correo: event.target.value })} /></div><div className="form-field"><label>Mensaje</label><textarea rows={4} placeholder="Cuéntanos sobre la estación o tu consulta..." required value={contactForm.mensaje} onChange={(event) => setContactForm({ ...contactForm, mensaje: event.target.value })}></textarea></div><button type="submit" className="btn-primary-lg" style={{ width: '100%', padding: '14px 36px' }}>Enviar mensaje <i className="fa-solid fa-paper-plane"></i></button>{contactSent && <p id="contacto-msg" style={{ marginTop: 12, fontSize: 13, color: '#39a900' }}>¡Mensaje enviado! Te contactaremos pronto.</p>}</form>
        </div>
      </section>

      <section id="preguntas-frecuentes" className="section faq-section">
        <div className="section-inner faq-inner">
          <div className="section-head reveal">
            <p className="eyebrow">Ayuda rápida</p>
            <h2>Preguntas frecuentes</h2>
            <p className="section-sub">Resuelve tus dudas sobre el mapa, las reservas y tu vehículo eléctrico.</p>
          </div>
          <div className="faq-list">
            {preguntasFrecuentes.map((item, index) => {
              const abierta = preguntaAbierta === index;
              return (
                <div className={`faq-item${abierta ? ' is-open' : ''}`} key={item.pregunta}>
                  <button className="faq-question" type="button" aria-expanded={abierta} onClick={() => setPreguntaAbierta(abierta ? null : index)}>
                    <span>{item.pregunta}</span>
                    <i className={`fa-solid ${abierta ? 'fa-minus' : 'fa-plus'}`} aria-hidden="true"></i>
                  </button>
                  {abierta && <div className="faq-answer"><p>{item.respuesta}</p></div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="footer"><div className="footer-inner"><div className="footer-brand"><img src="/img/logo.png" alt="EV Charge" className="footer-logo" /><p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '6px 0 4px' }}>EV Charge</p><p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 320 }}>Plataforma para localizar y gestionar estaciones de carga para vehículos eléctricos en Colombia.</p></div>
        <div className="footer-links"><p className="footer-title">Navegación</p><a href="#inicio">Inicio</a><a href="#categoria">Categoria</a><a href="#servicios">Servicios</a><Link to="/productos">Productos</Link><a href="#preguntas-frecuentes">Preguntas frecuentes</a><a href="#nosotros">Quiénes somos</a><a href="#contacto">Contacto</a></div>
        <div className="footer-links"><p className="footer-title">Contacto</p><div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}><span><i className="fa-solid fa-envelope"></i> eevcharge@gmail.com
</span><span><i className="fa-solid fa-location-dot"></i> Bogotá D.C., Colombia</span><span><i className="fa-solid fa-phone"></i> +57 300 123 4567</span></div></div>
        <div className="footer-links"><p className="footer-title">Información</p><p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 4px' }}>Versión 2.0</p><p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 4px' }}>Proyecto académico SENA ADSO</p><p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Última actualización: <span className="footer-year" style={{ fontWeight: 600, color: '#fff' }}>{year}</span></p></div>
      </div><div className="footer-bottom"><p>© <span className="footer-year">{year}</span> EV Charge • Todos los derechos reservados.</p></div></footer>

      {authModalOpen && (
        <div id="auth-modal" style={{ display: 'flex' }}>
          <div className="auth-backdrop" onClick={closeAuthModal}></div>
          <div className="auth-card">
            <button className="auth-close" onClick={closeAuthModal}>✕</button>
            <img src="/img/logo.png" alt="Logo" className="auth-logo" />

            {authTab !== 'recuperar' && <div className="auth-tabs">
                <button className={`auth-tab${authTab === 'login' ? ' active' : ''}`} onClick={() => switchAuthTab('login')} disabled={authLoading}>
                  Iniciar sesión
                </button>
                <button className={`auth-tab${authTab === 'registro' ? ' active' : ''}`} onClick={() => switchAuthTab('registro')} disabled={authLoading}>
                  Registrarse
                </button>
            </div>}

            {alert && (
              <div 
                id="auth-alert" 
                style={{
                  padding: '8px 12px',
                  marginBottom: '12px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: '12px',
                  backgroundColor: alert.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(57, 169, 0, 0.15)',
                  color: alert.type === 'error' ? '#ef4444' : '#39a900',
                  border: `1px solid ${alert.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(57, 169, 0, 0.4)'}`
                }}
              >
                {alert.message}
              </div>
            )}

          {authTab === 'login' && (
              <form id="form-login" onSubmit={doLogin}>
                <div className="form-group">
                  <label>Correo<span className="asterisco">*</span></label>
                  <input 
                    type="email" 
                    id="login-email" 
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)} 
                    placeholder="correo@ejemplo.com" 
                    disabled={authLoading}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña<span className="asterisco">*</span></label>
                  <div className="password-box">
                    <input 
                      id="login-pass" 
                      type={showLoginPass ? 'text' : 'password'} 
                      value={loginPass} 
                      onChange={(e) => setLoginPass(e.target.value)} 
                      placeholder="••••••••" 
                      disabled={authLoading}
                      required
                    />
                    <span 
                      className="password-eye" 
                      onClick={() => !authLoading && setShowLoginPass((value) => !value)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && !authLoading && setShowLoginPass((value) => !value)}
                    >
                      <i className={`fa-solid ${showLoginPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: '150px' }}>
                      <input 
                        type="checkbox" 
                        checked={recordarme} 
                        onChange={(e) => setRecordarme(e.target.checked)}
                        disabled={authLoading}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px', userSelect: 'none' }}>Recuérdame</span>
                    </label>
                    <button type="button" onClick={() => switchAuthTab('recuperar')} disabled={authLoading} style={{ background: 'none', border: 'none', color: '#39a900', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>

                {captchaRequired && (
                  <SimulatedCaptcha
                    key={captchaKey}
                    refreshKey={captchaKey}
                    onVerify={(isValid) => setCaptchaSolved(isValid)}
                  />
                )}

                <button type="submit" className="btn btn-primary btn-block" disabled={authLoading}>
                  {authLoading ? (
                    <span className="btn-loading-content">
                      <img src="/img/logo.png" alt="Cargando..." className="logo-spinner" /> Validando credenciales...
                    </span>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>
            )}

            {authTab === 'registro' && (
            <form id="form-registro" onSubmit={doRegistro}>
    <div className="form-group"><label>Nombre<span className="asterisco">*</span></label><input type="text" value={regNombre} onChange={(e) => setRegNombre(e.target.value)} placeholder="Tu nombre" disabled={authLoading} /></div>
    <div className="form-group"><label>Apellido<span className="asterisco">*</span></label><input type="text" value={regApellido} onChange={(e) => setRegApellido(e.target.value)} placeholder="Tu apellido" disabled={authLoading} /></div>
    <div className="form-group"><label>Correo</label><input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="correo@ejemplo.com" disabled={authLoading} /></div>
    <div className="form-group"><label>Contraseña<span className="asterisco">*</span></label><div className="password-box"><input type={showRegPass ? 'text' : 'password'} value={regPass} onChange={(e) => setRegPass(e.target.value)} placeholder="Crea tu contraseña" disabled={authLoading} /><span className="password-eye" onClick={() => !authLoading && setShowRegPass((value) => !value)}><i className={`fa-solid ${showRegPass ? 'fa-eye-slash' : 'fa-eye'}`}></i></span></div><div className={`strength-bar${regPass.length ? ' show' : ''}`}><div className="strength-progress" style={{ width: `${passwordPercent}%`, background: passwordPercent < 40 ? '#e74c3c' : passwordPercent < 80 ? '#f39c12' : '#39a900' }}></div></div><ul className={`password-requisitos${regPass.length ? ' show' : ''}`}>{requirementsList.map(([key, text]) => <li key={key} className={requirements[key] ? 'ok' : ''}><i className={`fa-solid ${requirements[key] ? 'fa-check' : 'fa-xmark'}`}></i> {text}</li>)}</ul></div>
    <div className="form-group"><label>Confirmar contraseña<span className="asterisco">*</span></label><input type="password" value={regPassConfirm} onChange={(e) => setRegPassConfirm(e.target.value)} placeholder="Repite tu contraseña" disabled={authLoading} onPaste={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} autoComplete="off" /></div>
                <button type="submit" id="btn-crear-cuenta" className="btn btn-primary btn-block" disabled={authLoading}>
                  {authLoading ? (
                    <span className="btn-loading-content">
                      <img src="/img/logo.png" alt="Cargando..." className="logo-spinner" /> Registrando cuenta...
                    </span>
                  ) : (
                    'Crear cuenta'
                  )}
                </button>
              </form>
            )}

            {authTab === 'recuperar' && <OlvidarContrasena onVolverAlLogin={() => switchAuthTab('login')} />}
          </div>
        </div>
      )}

      {categoriaSeleccionada && (
        <div id="categoria-modal" style={{ display: 'flex' }}>
          <div className="auth-backdrop" onClick={() => setCategoriaSeleccionada(null)}></div>
          <div className="categoria-modal-card">
            <button className="auth-close" onClick={() => setCategoriaSeleccionada(null)}>✕</button>
            <h2 className="categoria-modal-title">
              Catálogo: <span style={{ color: 'var(--green-ev)' }}>{categoriaSeleccionada}</span>
            </h2>
            
            <div className="categoria-modal-grid">
              {productosPorCategoria[categoriaSeleccionada].map((prod, i) => (
                <div key={i} className="cat-prod-card">
                  <div className="cat-prod-img">
                    <img src={prod.img} alt={prod.nombre} loading="lazy" decoding="async" />
                  </div>
                  <div className="cat-prod-info">
                    <h4>{prod.nombre}</h4>
                    <p>{prod.desc}</p>
                    <span className="cat-prod-price">{prod.precio}</span>
                    <button className="btn-primary" style={{ width: '100%', marginTop: '14px' }} onClick={() => void iniciarCompra(prod)}>Comprar ahora</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {productoDetalle && (
        <div className="producto-detail-modal" role="dialog" aria-modal="true" aria-label={`Detalles de ${productoDetalle.nombre}`}>
          <div className="auth-backdrop" onClick={() => setProductoDetalle(null)}></div>
          <div className="producto-detail-card">
            <button className="auth-close" onClick={() => setProductoDetalle(null)} aria-label="Cerrar detalles">✕</button>
            <img src={productoDetalle.img} alt={productoDetalle.nombre} loading="lazy" />
            <div><p className="producto-type">{productoDetalle.tipo}</p><h2>{productoDetalle.nombre}</h2><p>{productoDetalle.desc}</p><div className="producto-info"><span><i className="fa-solid fa-bolt"></i> {productoDetalle.potencia}</span><span><i className="fa-solid fa-plug"></i> {productoDetalle.conector}</span></div><strong className="producto-detail-price">${productoDetalle.monto.toLocaleString('es-CO')} COP</strong><button type="button" className="btn-primary btn-block" onClick={() => { setProductoDetalle(null); void iniciarCompra(productoDetalle); }}>Comprar ahora</button></div>
          </div>
        </div>
      )}

      {productoCompra && (
        <ModalPago
          tipo="producto"
          tituloItem={productoCompra.nombre}
          monto={productoCompra.monto}
          metodosGuardados={metodosPagoCompra}
          onCerrar={cerrarCompra}
          onExito={async () => {
            setProductoCompra(null);
            const listaActualizada = await listarNotificaciones().catch(() => null);
            if (listaActualizada) setNotificaciones(listaActualizada);
            notificar({ tipo: 'success', titulo: 'Compra completada', mensaje: `La compra de ${productoCompra.nombre} fue aprobada correctamente.` });
          }}
        />
      )}

      {errorSistema.visible && (
        <div id="error-sistema-modal">
          <div className="auth-backdrop" onClick={() => setErrorSistema({ visible: false, mensaje: '' })}></div>
          <div className="error-sistema-card">
            <button 
              className="auth-close error-close-btn" 
              onClick={() => setErrorSistema({ visible: false, mensaje: '' })}
              aria-label="Cerrar"
            >
              ✕
            </button>
            
            <div className="error-sistema-body">
              <div className="error-img-wrapper">
                <img 
                  src="/img/logo.png" 
                  alt="Error de conexión" 
                  className="error-sistema-img" 
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </> 
  );
}

export default App;
