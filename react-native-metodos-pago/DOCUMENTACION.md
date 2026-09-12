# Documentación del módulo de métodos de pago

## 1. Qué hace el módulo

El módulo permite que un usuario gestione sus métodos de pago asociados a la tabla `metodos_pago` de PostgreSQL.

Las operaciones disponibles son:

- Consultar sus métodos de pago.
- Crear una tarjeta o cuenta.
- Editar el tipo y el número o cuenta.
- Activar o desactivar un método.
- Eliminar un método con confirmación.

El mismo backend es utilizado por dos interfaces:

- El panel web existente en `frontend/`.
- La aplicación independiente Expo en `react-native-metodos-pago/`, compatible con Android, iOS y navegador.

## 2. Arquitectura

```text
React Native Web / Android / iOS
        │
        │  fetch + JWT
        ▼
FastAPI: /pagos
        │
        │  SQLAlchemy
        ▼
PostgreSQL: ev_charge_db.metodos_pago
```

La pantalla no consulta PostgreSQL directamente. La pantalla llama funciones del cliente de API; FastAPI valida el usuario y ejecuta las consultas en la base de datos.

## 3. Archivos importantes

### Aplicación móvil y web Expo

`react-native-metodos-pago/src/screens/MetodosPagoScreen.tsx`

Contiene la interfaz visual: tarjetas de métodos de pago, formulario modal, botones, switch de estado, mensajes, carga y confirmación de eliminación.

`react-native-metodos-pago/src/api/metodosPago.ts`

Contiene las funciones que llaman al backend:

- `listarMetodosPago()`
- `crearMetodoPago()`
- `actualizarMetodoPago()`
- `eliminarMetodoPago()`

También agrega el encabezado `Authorization: Bearer <token>` y resuelve la URL del backend según la plataforma.

`react-native-metodos-pago/App.tsx`

Es el punto de entrada de Expo y muestra `MetodosPagoScreen`.

### Panel web existente

`frontend/src/api/metodosPago.api.ts`

Cliente Axios del panel web.

`frontend/src/features/dashboard-usuario/metodos-pago/MetodosPagoPanel.tsx`

Panel CRUD integrado dentro de `DashboardPage.tsx`.

### Backend

`app/models/metodo_pago_model.py`

Define la tabla SQLAlchemy `metodos_pago`.

`app/schemas/metodos_pago_schema.py`

Define los datos permitidos para crear y actualizar.

`app/controllers/metodo_pago_controller.py`

Contiene la lógica de negocio y filtra siempre por `usuario_id`.

`app/routes/metodos_pago_routes.py`

Expone los endpoints `/pagos`.

`app/routes/auth_routes.py` y `app/controllers/auth_controller.py`

Contienen `/auth/demo`, utilizado para probar el módulo sin escribir credenciales manualmente.

## 4. Modelo de datos

La tabla se define así:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `String` | Identificador UUID del método. |
| `usuario_id` | `String` | Usuario propietario. Tiene relación con `usuarios.id`. |
| `tipo` | `String(30)` | Visa, Mastercard, Nequi, Daviplata u otro. |
| `numero` | `String(30)` | Número o cuenta registrada. |
| `estado` | `Boolean` | `true` activo, `false` inactivo. |
| `created_at` | `DateTime` | Fecha de creación. |

La relación pertenece al usuario autenticado. Un usuario solo puede consultar, modificar o eliminar sus propios registros.

## 5. Endpoints del backend

Todos los endpoints de métodos de pago requieren un JWT válido, excepto `/auth/demo`, que crea una sesión técnica de desarrollo.

### Listar

```http
GET /pagos
Authorization: Bearer <token>
```

Respuesta: arreglo de métodos del usuario autenticado.

### Crear

```http
POST /pagos
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "tipo": "Visa",
  "numero": "**** 4242",
  "estado": true
}
```

El backend evita registrar dos veces el mismo `numero` para el mismo usuario.

### Actualizar

```http
PUT /pagos/{id}
Authorization: Bearer <token>
Content-Type: application/json
```

Ejemplo para cambiar el estado:

```json
{
  "estado": false
}
```

Ejemplo para editar datos:

```json
{
  "tipo": "Mastercard",
  "numero": "**** 5555"
}
```

### Eliminar

```http
DELETE /pagos/{id}
Authorization: Bearer <token>
```

El controlador verifica que el método pertenezca al usuario antes de eliminarlo.

### Sesión demo

```http
POST /auth/demo
```

Este endpoint crea o reutiliza el usuario `demo@evcharge.com` y devuelve un JWT. La app móvil lo solicita automáticamente cuando no encuentra un token guardado; por eso se puede probar el CRUD sin mostrar un formulario de inicio de sesión.

La sesión demo se puede desactivar en el backend con:

```env
ENABLE_DEMO_AUTH=false
```

En ese caso la aplicación debe recibir un token de un login normal.

## 6. Flujo de una operación

### Crear un método

1. El usuario pulsa `Agregar`.
2. `MetodosPagoScreen.tsx` abre el modal.
3. Se selecciona el tipo y se escribe el número o cuenta.
4. La pantalla valida que existan al menos cuatro caracteres útiles.
5. Se llama `crearMetodoPago()` en `metodosPago.ts`.
6. El cliente envía `POST /pagos` con el JWT.
7. FastAPI obtiene el usuario desde el JWT.
8. El controlador crea el registro con ese `usuario_id`.
9. PostgreSQL guarda el registro.
10. La pantalla vuelve a consultar la lista y muestra el resultado.

### Editar o cambiar estado

Editar y activar/desactivar utilizan `PUT /pagos/{id}`. El backend solo cambia los campos recibidos y vuelve a entregar el método actualizado.

### Eliminar

1. La pantalla muestra una confirmación.
2. En web usa `window.confirm`; en Android/iOS usa `Alert`.
3. Si el usuario confirma, se llama `DELETE /pagos/{id}`.
4. El backend valida la propiedad del registro y ejecuta el borrado.
5. La pantalla actualiza la lista.

## 7. Configuración para ejecutar

### Backend

Desde la raíz del proyecto:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

El archivo `.env` del backend debe tener la conexión de PostgreSQL:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=ev_charge_db
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA
SECRET_KEY=UNA_CLAVE_SEGURA
```

### Aplicación Expo

```powershell
cd react-native-metodos-pago
npm install
npm run web
```

Para Android o iOS:

```powershell
npm run android
npm run ios
```

La URL se selecciona automáticamente:

- Navegador: `http://127.0.0.1:8000`.
- Emulador Android: `http://10.0.2.2:8000`.
- Teléfono físico: usa la IP local del equipo, por ejemplo `http://192.168.1.20:8000`.

También se puede definir manualmente `EXPO_PUBLIC_API_URL` en un archivo `.env` de la app Expo.

## 8. Consultar los datos en PostgreSQL

En pgAdmin abre:

`Databases → ev_charge_db → Schemas → public → Tables → metodos_pago`

Consulta recomendada:

```sql
SELECT
  mp.id,
  u.email,
  mp.tipo,
  mp.numero,
  mp.estado,
  mp.created_at
FROM metodos_pago mp
JOIN usuarios u ON u.id = mp.usuario_id
ORDER BY mp.created_at DESC;
```

Los registros creados con la sesión demo pertenecen a `demo@evcharge.com`.

## 9. Problemas frecuentes

### La app muestra métodos pero no aparecen en PostgreSQL

Comprueba que el backend esté activo en el puerto `8000`, recarga el navegador y revisa que la URL no sea `10.0.2.2` cuando estés usando web. Esa dirección es para el emulador Android.

### Error de CORS

El backend debe permitir el origen de la app, normalmente:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082
```

Después de cambiar `.env`, reinicia FastAPI.

### El botón eliminar no hace nada en web

Recarga la app con `Ctrl + R`. La versión actual usa `window.confirm` en navegador y `Alert` en dispositivos nativos.

### Error 401

El token expiró o no existe. En modo demo la app solicita automáticamente un token nuevo mediante `/auth/demo`. En producción se debe iniciar sesión normalmente.

## 10. Recomendación para producción

El código actual conserva el valor recibido en `numero` porque la tabla existente fue diseñada así. En un entorno real no se debería almacenar el número completo de una tarjeta. Se recomienda usar un proveedor de pagos, guardar solo los últimos cuatro dígitos y conservar un identificador tokenizado del proveedor.
