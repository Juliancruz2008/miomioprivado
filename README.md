# EV Charge

EV Charge es una plataforma web para localizar estaciones de carga, gestionar vehículos, crear reservas y administrar la información del sistema.

La estructura principal es:

- `app/`: backend FastAPI.
- `frontend/`: frontend React, TypeScript y Vite.
- `.env.example`: plantilla de configuración.
- `requirements.txt`: dependencias de Python.

## Requisitos para Windows

- Python 3.12 o superior.
- Node.js 20 o superior.
- PostgreSQL 14 o superior.

## Instalación

### 1. Descargar el proyecto

```powershell
git clone <URL_DEL_REPOSITORIO>
cd EV_CHARGE-Presentacion-proyecto
```

### 2. Crear la base de datos manualmente

Abre pgAdmin, conéctate al servidor PostgreSQL y crea una base de datos llamada `ev_charge_db`.

El proyecto no contiene scripts automáticos para crear la base de datos. Las tablas se crean al iniciar el backend mediante los modelos existentes.

### 3. Crear y activar el entorno de Python

Desde la raíz del proyecto:

```powershell
python -m venv .venv
```

```powershell
.\.venv\Scripts\Activate.ps1
```

Si PowerShell bloquea la activación:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 4. Instalar dependencias del backend

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Configurar `.env`

Copia la plantilla:

```powershell
Copy-Item .env.example .env
```

Edita `.env` y completa como mínimo:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=ev_charge_db
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA_DE_POSTGRESQL
SECRET_KEY=UNA_CLAVE_LARGA_Y_SEGURA
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
VITE_API_URL=http://127.0.0.1:8000
OCM_API_KEY=tu_clave_de_openchargemap
```

No subas `.env` a GitHub.

### 6. Iniciar el backend

Desde la raíz del proyecto:

```powershell
python -m uvicorn app.main:app --reload
```

La API estará disponible en `http://127.0.0.1:8000` y su documentación en `http://127.0.0.1:8000/docs`.

### 7. Instalar e iniciar el frontend

Abre otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

Si aparece `vite no se reconoce como un comando`, ejecuta nuevamente `npm install` desde la carpeta `frontend`. No ejecutes `npm run dev` desde la raíz.

Si Vite inicia en el puerto `5174`, reinicia el backend después de cambiar `CORS_ORIGINS` para que cargue la configuración nueva.

## Cuenta administradora

Registra primero el usuario desde la aplicación. Después, desde pgAdmin, habilítalo manualmente:

```sql
UPDATE usuarios
SET is_admin = TRUE
WHERE email = 'TU_CORREO';
```

El proyecto no crea administradores automáticamente.

## Asistente de EV Charge

El asistente aparece en las páginas públicas y privadas. Puede orientar sobre reservas, vehículos, estaciones, pagos, compras, reportes y el resto de las funciones disponibles. No ejecuta cambios ni guarda conversaciones permanentemente.

Es opcional. Si `OPENAI_API_KEY` queda vacío, funciona con respuestas locales y el sistema sigue operativo. Para habilitar respuestas generadas por IA, agrega al `.env`:

```env
OPENAI_API_KEY=TU_CLAVE_PRIVADA
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
AI_TIMEOUT_SECONDS=20
AI_RATE_LIMIT_PER_MINUTE=20
```

La clave se lee únicamente desde FastAPI. Nunca la coloques en archivos del frontend ni la subas a GitHub.

El mapa consulta estaciones externas mediante `OCM_API_KEY`. Si la clave no está configurada o el servicio externo no responde, el sistema intenta mostrar las estaciones propias guardadas en la base de datos. Para ver estaciones externas, agrega una clave válida en `.env` y reinicia el backend.

## Errores comunes

### `401 Unauthorized` al iniciar sesión

El backend está activo, pero el correo o la contraseña no coinciden con un usuario registrado. La aplicación muestra `Correo o contraseña incorrectos`.

### `400 Bad Request` al registrarse

Revisa que el correo no esté registrado y que la contraseña tenga mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.

### No se conecta PostgreSQL

Verifica que el servicio esté iniciado, que exista `ev_charge_db`, que el puerto sea `5432` y que la contraseña de `.env` sea correcta.

## Comprobaciones

Backend:

```powershell
python -m compileall -q app
```

Frontend:

```powershell
cd frontend
npm run build
```

## GitHub

No subas `.env`, `.venv`, `frontend/node_modules`, `frontend/dist`, logs ni archivos temporales. El `.gitignore` del proyecto debe conservar estas exclusiones.

## Funcionalidades

- Registro, inicio de sesión y recuperación de contraseña.
- Roles de usuario y administrador.
- Gestión de vehículos y reservas.
- Mapa de estaciones y planificación de rutas.
- Métodos de pago y pago asociado a reservas.
- Historial y estadísticas de cargas.
- Favoritos, reportes, calificaciones y notificaciones.
- Panel administrativo.

Proyecto académico desarrollado en el programa ADSO del SENA.
