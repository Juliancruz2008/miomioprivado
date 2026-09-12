# EV Charge · Métodos de pago móvil y web

Proyecto independiente en React Native + Expo para administrar los registros de la tabla `metodos_pago` del backend actual. La misma pantalla funciona en Android, iOS y navegador mediante React Native Web. Incluye listado, creación, edición, activación, desactivación y eliminación.

## Ejecutar

1. Copia `.env.example` a `.env` y define `EXPO_PUBLIC_API_URL`.
   - Para el emulador Android usa `http://10.0.2.2:8000`.
   - En un teléfono físico usa la IP local del equipo donde se ejecuta FastAPI, por ejemplo `http://192.168.1.20:8000`.
2. Ejecuta `npm install`.
3. Ejecuta `npm start` y abre el proyecto con Expo Go, un emulador Android/iOS o el navegador.

Comandos directos:

```bash
npm run android
npm run ios
npm run web
```

Para generar una versión web lista para publicar:

```bash
npx expo export --platform web
```

La pantalla lee el JWT desde `AsyncStorage` bajo la clave `ev_token`, igual que el cliente web. Cuando se integre el login móvil, guarda el token recibido con:

```ts
import { guardarTokenSesion } from './src/api/metodosPago';

await guardarTokenSesion(token);
```

Luego las peticiones autenticadas se realizan automáticamente contra `GET`, `POST`, `PUT` y `DELETE /pagos`.

Si no existe un token, la app solicita automáticamente al backend una sesión demo de desarrollo, sin mostrar formulario de inicio de sesión. En ese caso las operaciones se guardan en PostgreSQL bajo `demo@evcharge.com`. Si el backend no está disponible, usa un respaldo local en `AsyncStorage`. Para exigir autenticación en una compilación real define `EXPO_PUBLIC_DEMO_MODE=false` y `ENABLE_DEMO_AUTH=false` en el backend.
