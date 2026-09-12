// Rutas de la SPA. Cada página nueva (mapa, dashboard, admin) se agrega aquí
// a medida que se migra desde public/*.html.
import { lazy, Suspense, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import App from '../App';
import { GlobalNotifications } from '../components/GlobalNotifications';
import { AsistenteChat } from '../components/AsistenteChat';

const MapaPage = lazy(() => import('../features/mapa/MapaPage').then(({ MapaPage }) => ({ default: MapaPage })));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })));
const AdminPage = lazy(() => import('../features/admin/AdminPage').then(({ AdminPage }) => ({ default: AdminPage })));
const ProductosPage = lazy(() => import('../features/productos/ProductosPage').then(({ ProductosPage }) => ({ default: ProductosPage })));

// Redirige a "/" si no hay sesión iniciada.
function RutaPrivada({ children }: { children: ReactElement }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Navigate to="/" replace />;
  if (usuario.is_admin) return <Navigate to="/admin" replace />;
  return children;
}

// Redirige a "/dashboard" si no es admin.
function RutaAdmin({ children }: { children: ReactElement }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Navigate to="/" replace />;
  if (!usuario.is_admin) return <Navigate to="/dashboard" replace />;
  return children;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="page-loading">Cargando página...</div>}>
        <GlobalNotifications />
        <AsistenteChat />
        <Routes>
        <Route path="/" element={<App />} />
        <Route path="/mapa" element={<MapaPage />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/mapa.html" element={<Navigate to="/mapa" replace />} />
        <Route
          path="/dashboard"
          element={
            <RutaPrivada>
              <DashboardPage />
            </RutaPrivada>
          }
        />
        <Route
          path="/dashboard_usuario.html"
          element={
            <RutaPrivada>
              <Navigate to="/dashboard" replace />
            </RutaPrivada>
          }
        />
        <Route
          path="/admin"
          element={
            <RutaAdmin>
              <AdminPage />
            </RutaAdmin>
          }
        />
        <Route path="/admin.html" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
