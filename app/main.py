# main.py
from dotenv import load_dotenv
load_dotenv()  # Cargar variables de .env
import os

from fastapi import FastAPI
from fastapi import APIRouter
from app.controllers.mapa_controller import MapaController
from fastapi.middleware.cors import CORSMiddleware

router = APIRouter()
mapa_ctrl = MapaController()
@router.get("/api/estaciones")
def obtener_estaciones(lat: float, lon: float):
    return mapa_ctrl.obtener_estaciones_cercanas(lat, lon)

# Configuración e intermedios con prefijo app.
from app.config.database import Base, engine
from sqlalchemy import text
from app.middleware.error_handler import ErrorHandler
import app.models

# ==========================================
# IMPORTACIÓN DE ROUTERS
# ==========================================
from app.routes.auth_routes import router as auth_router
from app.routes.vehiculos_routes import router as vehicle_router
from app.routes.admin_routes import router as admin_router
from app.routes import mapa_routes
from app.routes import olvidar_contraseña
from app.routes.metodos_pago_routes import router as metodo_pago_router
from app.routes.reservas_routes import router as reservas_router
from app.routes.reportes_routes import router as reportes_router
from app.routes.favoritos_routes import router as favoritos_router
from app.routes.cargas_routes import router as cargas_router
from app.routes.calificaciones_routes import router as calificaciones_router
from app.routes.notificaciones_routes import router as notificaciones_router
from app.routes.contacto_routes import router as contacto_router
from app.routes.estado_routes import router as estado_router
from app.routes import pagos
from app.routes.compras_routes import router as compras_router
from app.routes import asistente_routes

# ==========================================
# CREACIÓN AUTOMÁTICA DE TABLAS
# ==========================================
Base.metadata.create_all(bind=engine)
with engine.begin() as connection:
    connection.execute(text("ALTER TABLE estaciones_propias ADD COLUMN IF NOT EXISTS estado VARCHAR DEFAULT 'activa'"))
    connection.execute(text("UPDATE estaciones_propias SET estado = CASE WHEN activa = TRUE THEN 'activa' ELSE 'inactiva' END WHERE estado IS NULL"))
    connection.execute(text("ALTER TABLE estados_estaciones ADD COLUMN IF NOT EXISTS nombre VARCHAR"))
    connection.execute(text("ALTER TABLE estados_estaciones ADD COLUMN IF NOT EXISTS direccion VARCHAR"))
    connection.execute(text("ALTER TABLE estados_estaciones ADD COLUMN IF NOT EXISTS operador VARCHAR"))
    connection.execute(text("ALTER TABLE estaciones_propias ADD COLUMN IF NOT EXISTS operador VARCHAR DEFAULT 'EV Charge'"))
    connection.execute(text("ALTER TABLE estados_estaciones ADD COLUMN IF NOT EXISTS lat FLOAT"))
    connection.execute(text("ALTER TABLE estados_estaciones ADD COLUMN IF NOT EXISTS lon FLOAT"))
    connection.execute(text("ALTER TABLE estados_estaciones ADD COLUMN IF NOT EXISTS eliminada BOOLEAN NOT NULL DEFAULT FALSE"))
    connection.execute(text("ALTER TABLE cargas ADD COLUMN IF NOT EXISTS estado VARCHAR NOT NULL DEFAULT 'pendiente'"))
    connection.execute(text("UPDATE cargas SET estado = 'pendiente' WHERE estado IS NULL"))
    connection.execute(text("ALTER TABLE reservas ADD COLUMN IF NOT EXISTS cargador_id VARCHAR"))
    connection.execute(text("ALTER TABLE cargas ADD COLUMN IF NOT EXISTS cargador_id VARCHAR"))


# ==========================================
# INSTANCIA FASTAPI
# ==========================================
app = FastAPI(
    title="API Estaciones de Carga - ADSO SENA",
    version="1.0.0"
)


# ==========================================
# CONFIGURACIÓN CORS Y MIDDLEWARE
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origen.strip()
        for origen in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:8082,http://127.0.0.1:8082"
        ).split(",")
        if origen.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(ErrorHandler)


# ==========================================
# REGISTRO DE RUTAS
# ==========================================
app.include_router(mapa_routes.router)
app.include_router(auth_router)
app.include_router(olvidar_contraseña.router, prefix="/api/auth", tags=["Recuperación de Contraseña"])
app.include_router(vehicle_router)
app.include_router(admin_router)
app.include_router(metodo_pago_router)
app.include_router(reservas_router)
app.include_router(reportes_router)
app.include_router(favoritos_router)
app.include_router(cargas_router)
app.include_router(calificaciones_router)
app.include_router(notificaciones_router)
app.include_router(contacto_router)
app.include_router(estado_router)
app.include_router(pagos.router)
app.include_router(compras_router)
app.include_router(asistente_routes.router)

# ==========================================
# RUTA RAÍZ
# ==========================================
@app.get("/")
def home():
    return {
        "success": True,
        "message": "API de Monitoreo de Carga funcionando correctamente ⚡"
    }
