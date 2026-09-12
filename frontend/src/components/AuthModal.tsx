// Modal de login/registro reutilizable entre páginas (mapa, dashboard, admin).
import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { registro as registroApi, ApiError } from '../api/auth.api';

export type AuthTab = 'login' | 'registro';

interface AuthModalProps {
  initialTab?: AuthTab;
  onClose: () => void;
}

const REQUISITOS: [string, string][] = [
  ['min', 'Mínimo 8 caracteres'],
  ['may', 'Una mayúscula'],
  ['low', 'Una minúscula'],
  ['num', 'Un número'],
  ['sim', 'Un símbolo'],
  ['same', 'Las contraseñas coinciden'],
];

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

export function AuthModal({ initialTab = 'login', onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [authTab, setAuthTab] = useState<AuthTab>(initialTab);
  const [alert, setAlert] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaSolved, setCaptchaSolved] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPassConfirm, setRegPassConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegPassConfirm, setShowRegPassConfirm] = useState(false);

  const requisitos = useMemo(
    () => ({
      min: regPass.length >= 8,
      may: /[A-Z]/.test(regPass),
      low: /[a-z]/.test(regPass),
      num: /\d/.test(regPass),
      sim: /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(regPass),
      same: regPass === regPassConfirm && regPass !== '',
    }),
    [regPass, regPassConfirm],
  );

  const score = Object.values(requisitos).filter(Boolean).length;
  const passwordCompleta = score === 6;
  const passwordPercent = (score / 6) * 100;

  const cambiarTab = (tab: AuthTab) => {
    setAuthTab(tab);
    setAlert(null);
  };

  const doLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) return setAlert({ message: ' Completa todos los campos', type: 'error' });

    if (captchaRequired && !captchaSolved) {
      return setAlert({ message: ' Por favor, verifica que no eres un robot.', type: 'error' });
    }

    setAuthLoading(true);
    try {
      await login(loginEmail, loginPass);
      onClose();
    } catch (error: any) {
      // Extraemos el mensaje de error de manera segura sin importar de qué tipo sea
      const errorMsg = error instanceof Error ? error.message : String(error || '');

      if (errorMsg.includes('captcha_required')) {
        setCaptchaRequired(true);
        setCaptchaSolved(false);
        setCaptchaKey((prev) => prev + 1);
        setAlert({ message: ' Demasiados intentos. Verifica que no eres un robot.', type: 'error' });
      } else if (errorMsg.includes('minutos')) {
        setCaptchaRequired(false);
        setAlert({ message: ` ${errorMsg}`, type: 'error' });
      } else {
        const isUnauthorized = error instanceof ApiError && error.status === 401;
        setAlert({ 
          message: isUnauthorized || errorMsg.includes('401') || errorMsg.includes('credenciales') 
            ? ' Correo o contraseña incorrectos' 
            : errorMsg || 'Error de autenticación', 
          type: 'error' 
        });

        if (captchaRequired) {
          setCaptchaSolved(false);
          setCaptchaKey((prev) => prev + 1);
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const doRegistro = async (e: FormEvent) => {
    e.preventDefault();

    if (!regNombre || !regApellido || !regEmail || !regPass || !regPassConfirm) {
      return setAlert({ message: ' Por favor, digite todos los datos solicitados.', type: 'error' });
    }

    if (!passwordCompleta) {
      return setAlert({ message: ' Tu contraseña no cumple todos los requisitos.', type: 'error' });
    }

    setAuthLoading(true);
    try {
      await registroApi(regNombre, regApellido, regEmail, regPass);
      setAlert({ message: ' ¡Registro exitoso! Ahora inicia sesión.', type: 'success' });
      cambiarTab('login');
      setLoginEmail(regEmail);
    } catch (error: any) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 409 || error.status === 422)) {
        setAlert({ message: ' Este correo ya está registrado, intente con otro.', type: 'error' });
      } else {
        setAlert({ message: error instanceof ApiError ? error.message : 'Error al registrar', type: 'error' });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div id="auth-modal" style={{ display: 'flex' }}>
      <div className="auth-backdrop" onClick={onClose}></div>
      <div className="auth-card">
        <button className="auth-close" onClick={onClose}>✕</button>
        <img src="/img/logo.png" alt="Logo" className="auth-logo" />
        <div className="auth-tabs">
          <button className={`auth-tab${authTab === 'login' ? ' active' : ''}`} onClick={() => cambiarTab('login')}>Iniciar sesión</button>
          <button className={`auth-tab${authTab === 'registro' ? ' active' : ''}`} onClick={() => cambiarTab('registro')}>Registrarse</button>
        </div>

        {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

        {authTab === 'login' ? (
          <form onSubmit={doLogin}>
            <div className="form-group">
              <label>Correo<span className="asterisco">*</span></label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="form-group">
              <label>Contraseña<span className="asterisco">*</span></label>
              <div className="password-box">
                <input type={showLoginPass ? 'text' : 'password'} value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••" />
                <button type="button" className="password-eye" aria-label={showLoginPass ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowLoginPass((v) => !v)}>
                  <i className={`fa-solid ${showLoginPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
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

            <button type="submit" className="btn btn-primary btn-block" disabled={authLoading}>{authLoading ? 'Entrando...' : 'Entrar'}</button>
          </form>
        ) : (
          <form onSubmit={doRegistro}>
           <div className="form-group"><label>Nombre<span className="asterisco">*</span></label><input type="text" value={regNombre} onChange={(e) => setRegNombre(e.target.value)} placeholder="Tu nombre" /></div>
           <div className="form-group"><label>Apellido<span className="asterisco">*</span></label><input type="text" value={regApellido} onChange={(e) => setRegApellido(e.target.value)} placeholder="Tu apellido" /></div>
           <div className="form-group"><label>Correo<span className="asterisco">*</span></label><input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
           <div className="form-group">
              <label>Contraseña<span className="asterisco">*</span></label>
              <div className="password-box">
                <input type={showRegPass ? 'text' : 'password'} value={regPass} onChange={(e) => setRegPass(e.target.value)} placeholder="Crea tu contraseña" />
                <button type="button" className="password-eye" aria-label={showRegPass ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowRegPass((v) => !v)}>
                  <i className={`fa-solid ${showRegPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <div className={`strength-bar${regPass.length ? ' show' : ''}`}>
                <div className="strength-progress" style={{ width: `${passwordPercent}%`, background: passwordPercent < 40 ? '#e74c3c' : passwordPercent < 80 ? '#f39c12' : '#39a900' }}></div>
              </div>
              <ul className={`password-requisitos${regPass.length ? ' show' : ''}`}>
                {REQUISITOS.map(([key, text]) => (
                  <li key={key} className={requisitos[key as keyof typeof requisitos] ? 'ok' : ''}>
                    <i className={`fa-solid ${requisitos[key as keyof typeof requisitos] ? 'fa-check' : 'fa-xmark'}`}></i> {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="form-group">
              <label>Confirmar contraseña<span className="asterisco">*</span></label>
              <div className="password-box">
                <input type={showRegPassConfirm ? 'text' : 'password'} value={regPassConfirm} onChange={(e) => setRegPassConfirm(e.target.value)} placeholder="Repite tu contraseña" onPaste={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} autoComplete="off" />
                <button type="button" className="password-eye" aria-label={showRegPassConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'} onClick={() => setShowRegPassConfirm((v) => !v)}>
                  <i className={`fa-solid ${showRegPassConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={authLoading || !regNombre.trim() || !regApellido.trim() || !regEmail.trim() || !passwordCompleta}>
              {authLoading ? 'Creando...' : 'Crear cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
