import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../../styles.css';
import { useAuth } from '../../context/AuthContext';
import { listarMetodosPago, type MetodoPago } from '../../api/metodosPago.api';
import { ModalPago } from '../../components/ModalPago';
import { notificar } from '../../components/GlobalNotifications';
import { catalogoProductos, categoriasProducto, type CategoriaKey, type ProductoCatalogo } from './productos.data';

export function ProductosPage() {
  const { usuario } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoriaInicial = searchParams.get('categoria') as CategoriaKey | null;
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<'Todas' | CategoriaKey>(categoriasProducto.includes(categoriaInicial as CategoriaKey) ? categoriaInicial as CategoriaKey : 'Todas');
  const [orden, setOrden] = useState('relevancia');
  const [detalle, setDetalle] = useState<ProductoCatalogo | null>(null);
  const [compra, setCompra] = useState<ProductoCatalogo | null>(null);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);

  useEffect(() => {
    const urlCategoria = searchParams.get('categoria') as CategoriaKey | null;
    if (urlCategoria && categoriasProducto.includes(urlCategoria)) setCategoria(urlCategoria);
  }, [searchParams]);

  const productos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const resultado = catalogoProductos.filter((producto) => {
      const coincideCategoria = categoria === 'Todas' || producto.categoria === categoria;
      const coincideTexto = !texto || [producto.nombre, producto.desc, producto.categoria, producto.tipo, producto.conector].some((valor) => valor.toLowerCase().includes(texto));
      return coincideCategoria && coincideTexto;
    });
    return [...resultado].sort((a, b) => orden === 'precio-menor' ? a.monto - b.monto : orden === 'precio-mayor' ? b.monto - a.monto : orden === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es') : 0);
  }, [busqueda, categoria, orden]);

  const seleccionarCategoria = (valor: 'Todas' | CategoriaKey) => {
    setCategoria(valor);
    if (valor === 'Todas') setSearchParams({});
    else setSearchParams({ categoria: valor });
  };

  const iniciarCompra = async (producto: ProductoCatalogo) => {
    if (!usuario) {
      notificar({ tipo: 'warning', titulo: 'Inicia sesión', mensaje: 'Debes iniciar sesión para comprar este producto.' });
      return;
    }
    const metodos = await listarMetodosPago().catch(() => [] as MetodoPago[]);
    setMetodosPago(metodos);
    setCompra(producto);
  };

  return <div className="productos-page">
    <header className="productos-page-header">
      <div className="productos-topbar-left"><Link className="productos-back-button" to="/" aria-label="Regresar al inicio"><i className="fa-solid fa-arrow-left"></i><span>Inicio</span></Link></div>
      <Link className="productos-brand" to="/" aria-label="Volver al inicio"><img src="/img/logo.png" alt="EV Charge" /><span>EV CHARGE</span></Link>
      <div className="productos-topbar-right"><Link className="productos-map-button" to="/mapa">Abrir mapa <i className="fa-solid fa-location-dot"></i></Link></div>
    </header>
    <main className="productos-page-main">
      <div className="productos-page-title"><p className="eyebrow">Catálogo EV Charge</p><h1>{categoria === 'Todas' ? 'Productos para movilidad eléctrica' : `Productos de ${categoria}`}</h1><p>Encuentra cargadores, accesorios y soluciones para tu vehículo eléctrico.</p></div>
      <div className="productos-page-toolbar"><label className="productos-search"><i className="fa-solid fa-magnifying-glass"></i><input type="search" placeholder="Buscar productos..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} /></label><label className="productos-filter"><span>Categoría</span><select value={categoria} onChange={(event) => seleccionarCategoria(event.target.value as 'Todas' | CategoriaKey)}><option>Todas</option>{categoriasProducto.map((item) => <option key={item}>{item}</option>)}</select></label><label className="productos-filter"><span>Ordenar</span><select value={orden} onChange={(event) => setOrden(event.target.value)}><option value="relevancia">Más relevantes</option><option value="precio-menor">Precio: menor a mayor</option><option value="precio-mayor">Precio: mayor a menor</option><option value="nombre">Nombre: A-Z</option></select></label></div>
      {productos.length ? <div className="productos-catalog-grid">{productos.map((producto) => <article className="producto-card producto-catalog-card" key={producto.nombre}><div className="producto-image"><img src={producto.img} alt={producto.nombre} loading="lazy" decoding="async" /><span className="producto-badge">{producto.etiqueta}</span><span className="producto-category-badge">{producto.categoria}</span></div><div className="producto-content"><p className="producto-type">{producto.tipo}</p><h2>{producto.nombre}</h2><p className="producto-desc">{producto.desc}</p><div className="producto-info"><span><i className="fa-solid fa-bolt"></i> {producto.potencia}</span><span><i className="fa-solid fa-plug"></i> {producto.conector}</span></div><div className="producto-catalog-footer"><strong>${producto.monto.toLocaleString('es-CO')} COP</strong><div className="producto-actions"><button className="producto-details-btn" onClick={() => setDetalle(producto)}>Ver detalles</button><button className="producto-btn" onClick={() => void iniciarCompra(producto)}>Comprar</button></div></div></div></article>)}</div> : <div className="productos-empty"><i className="fa-solid fa-box-open"></i><p>No encontramos productos con esos filtros.</p><button className="producto-details-btn" onClick={() => { setBusqueda(''); seleccionarCategoria('Todas'); }}>Limpiar filtros</button></div>}
    </main>
    <footer className="productos-page-footer">© {new Date().getFullYear()} EV Charge · Productos para movilidad eléctrica</footer>
    {detalle && <div className="producto-detail-modal" role="dialog" aria-modal="true"><div className="auth-backdrop" onClick={() => setDetalle(null)}></div><div className="producto-detail-card"><button className="auth-close" onClick={() => setDetalle(null)} aria-label="Cerrar detalles">✕</button><img src={detalle.img} alt={detalle.nombre} /><div><p className="producto-type">{detalle.tipo}</p><h2>{detalle.nombre}</h2><p>{detalle.desc}</p><div className="producto-info"><span><i className="fa-solid fa-bolt"></i> {detalle.potencia}</span><span><i className="fa-solid fa-plug"></i> {detalle.conector}</span></div><strong className="producto-detail-price">${detalle.monto.toLocaleString('es-CO')} COP</strong><button className="btn-primary btn-block" onClick={() => { setDetalle(null); void iniciarCompra(detalle); }}>Comprar ahora</button></div></div></div>}
    {compra && <ModalPago tipo="producto" tituloItem={compra.nombre} monto={compra.monto} metodosGuardados={metodosPago} onCerrar={() => setCompra(null)} onExito={async () => { setCompra(null); notificar({ tipo: 'success', titulo: 'Compra completada', mensaje: `La compra de ${compra.nombre} fue aprobada correctamente.` }); }} />}
  </div>;
}

export default ProductosPage;
