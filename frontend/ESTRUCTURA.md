# Estructura de carpetas - EV Charge Frontend

## FIX aplicado (corrige "no abre el mapa" y estilos rotos)
El paso de limpieza anterior eliminó `estilos.css`, `mapa.html`, `admin.html` y
`dashboard_usuario.html` de la raíz sin actualizar quién los necesitaba. Esto
rompió dos cosas:
1. `src/styles.css` seguía con `@import url("../estilos.css")` apuntando a un
   archivo que ya no existía → se corrigió a `@import url("./styles/estilos.css")`.
2. El botón "Abrir mapa" (`href="/mapa.html"`) apuntaba a un archivo que ya no
   se servía → `mapa.html`, `admin.html` y `dashboard_usuario.html` (con sus
   CSS) se copiaron a `public/`, que es la carpeta que Vite sí sirve tal cual.

**Por qué quedan duplicados en `public/*.css` y `src/styles/*.css`:** mientras
`mapa.html`/`admin.html`/`dashboard_usuario.html` sigan siendo HTML plano (no
migrados a React todavía), necesitan sus CSS como archivos sueltos y accesibles
por URL en `public/`. `src/styles/` es la copia que usará el código React
cuando migremos esas páginas. Cuando migremos cada página, el archivo suelto
en `public/` se elimina.

## Estructura de `src/` (por feature, mapeada 1-a-1 a tu backend)
- `api/` — httpClient.ts + un `*.api.ts` por controller del backend
- `features/landing/`, `features/auth/`, `features/mapa/`,
  `features/dashboard-usuario/{vehiculos,reservas,favoritos,metodos-pago,calificaciones}/`,
  `features/admin/{estaciones,reportes,usuarios}/`
- `components/`, `context/` (AuthContext), `layouts/`, `routes/` (AppRouter),
  `types/`, `utils/`, `styles/`

## Raíz del proyecto
- `public/` — todo lo que se sirve tal cual: img/, y (temporalmente, mientras
  se migra) mapa.html, admin.html, dashboard_usuario.html + sus CSS.
- `legacy-pages-to-migrate/` — copia de referencia de esos mismos HTML, solo
  para consulta mientras se escriben los componentes React equivalentes. NO
  se sirve, no la toques para arreglar bugs — arregla la copia en `public/`.
- `src/` — código React.
- `index.html`, `vite.config.ts`, `tsconfig*.json`, `package.json`.

## Progreso hasta ahora
1. ✅ Estructura de carpetas por feature creada.
2. ✅ Limpieza de la raíz (se sacó backend viejo main.py/ev_charge.db, HTML/CSS
   sueltos organizados).
3. ✅ Bug de estilos rotos y mapa que no abría — corregido.
4. ⬜ Dividir `App.tsx` -> `features/landing/` + `features/auth/`.
5. ⬜ `AuthContext` + `useAuth`.
6. ⬜ `routes/AppRouter.tsx` con react-router-dom (`/`, `/mapa`, `/dashboard`, `/admin`).
7. ⬜ Migrar `mapa.html` -> `features/mapa/` (con Leaflet).
8. ⬜ Migrar `dashboard_usuario.html` -> `features/dashboard-usuario/*`.
9. ⬜ Migrar `admin.html` -> `features/admin/*`.
10. ⬜ Conectar cada `*.api.ts` a los endpoints reales de
    `EV_CHARGE-refactor-backend-postgresql` (falta hacer).

## Backend
Proyecto separado: `EV_CHARGE-refactor-backend-postgresql` (FastAPI +
PostgreSQL), con arquitectura en capas: `app/controllers`, `app/models`,
`app/routes`, `app/schemas`, `app/config`, `app/middleware`, `app/utils`.
Dominios: auth, vehiculos, reservas, favoritos, metodos_pago, reportes,
calificaciones, mapa, admin, cargas, estado.

El frontend en este momento se conecta a `API_BASE_URL = 'http://127.0.0.1:8000'`
(definido en `src/api/httpClient.ts`) — verificar que coincida con cómo levantas
tu backend real.

## Ajustes de estilo (última sesión)
- **Modal de registro cortado**: `.auth-card` no tenía límite de altura ni
  scroll → se agregó `max-height: 90vh; overflow-y: auto;` con scrollbar
  delgada a juego con el tema. Ahora el formulario completo (incluida la
  lista de requisitos de contraseña) siempre se puede ver y scrollear dentro
  del modal.
- **Emojis reemplazados por iconos** (Font Awesome, ya cargado en `index.html`):
  servicios (mapa, auto, brújula, estrella, portapapeles, calendario), botón
  "Iniciar navegación", potencia/conector en tarjetas de producto, contacto en
  el footer, ojo mostrar/ocultar contraseña, check/x de requisitos de
  contraseña.
- **Botón "Ver producto" estático** → ahora hace scroll suave a la sección de
  Contacto (no había página de detalle de producto, así que se conecta al
  flujo de "Consultar precio" que ya existe).
- **Padding en tarjetas de producto**: más espacio entre el borde superior del
  contenido y la etiqueta de tipo, y entre la etiqueta y el título, para que
  no se vean pegados.
- **Filtro de conectores en el mapa** (`public/mapa.html`): no estaba roto,
  está deshabilitado a propósito hasta iniciar sesión, pero no lo explicaba.
  Se agregó un `title` (tooltip al pasar el mouse) aclarándolo.
- Limpieza: se eliminó `public/estilos.css`, que no lo usaba ninguna página
  estática (era una copia sin uso).
