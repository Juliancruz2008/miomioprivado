# Frontend de EV Charge

Aplicación React + TypeScript + Vite para la landing page, el mapa de estaciones, el dashboard de usuario y el panel administrativo.

## Desarrollo

Desde este directorio:

```bash
npm install
npm run dev
```

El frontend utiliza `http://127.0.0.1:8000` como backend por defecto. Para cambiarlo, definir:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## Producción

```bash
npm run build
```

El resultado se genera en `dist/`.

## Módulos

- `src/features/landing`: página inicial y acceso al sistema.
- `src/features/mapa`: mapa, estaciones, rutas y tráfico.
- `src/features/dashboard`: funciones del usuario autenticado.
- `src/features/admin`: administración de usuarios, estaciones, reportes y reservas.
- `src/api`: cliente HTTP y servicios de la API.
- `src/context`: sesión y usuario actual.

Las peticiones al backend deben utilizar el cliente centralizado de `src/api/httpClient.ts`.
