// Estado global de sesión: usuario logueado + token.
// Reemplaza las lecturas dispersas de localStorage que había en App.tsx.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { obtenerPerfil, login as loginApi, logout as logoutApi, type Usuario } from '../api/auth.api';

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  actualizarUsuario: (usuario: Usuario) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ev_token');
    if (!token) {
      setCargando(false);
      return;
    }
    obtenerPerfil()
      .then((data) => setUsuario(data.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginApi(email, password);
    setUsuario(data.usuario);
  };

  const logout = () => {
    logoutApi();
    setUsuario(null);
  };

  const actualizarUsuario = (usuarioActualizado: Usuario) => setUsuario(usuarioActualizado);

  return <AuthContext.Provider value={{ usuario, cargando, login, actualizarUsuario, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
