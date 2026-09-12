# app/routes/mapa_routes.py
from fastapi import APIRouter
from app.controllers.mapa_controller import MapaController
from app.config.database import get_db
from app.controllers.admin_controller import listar_estaciones_mapa, listar_estaciones_mapa_bogota, listar_estaciones_mapa_cercanas
from app.utils.jwt import require_admin
from fastapi import Depends
from sqlalchemy.orm import Session

router = APIRouter(tags=["Mapa y Servicios Externos"])
mapa_controller = MapaController()

@router.get("/buscar-ruta")
def buscar_ruta(user_lat: float, user_lon: float, dest_lat: float, dest_lon: float):
    return mapa_controller.obtener_ruta_vial(user_lat, user_lon, dest_lat, dest_lon)

@router.get("/planificar-viaje")
def planificar_viaje(origen_lat: float, origen_lon: float, destino_lat: float, destino_lon: float, autonomia_km: float = 300):
    return mapa_controller.planificar_viaje(origen_lat, origen_lon, destino_lat, destino_lon, autonomia_km)

@router.get("/mostrar-estacion")
def obtener_estaciones(lat: float, lon: float):
    return mapa_controller.obtener_estaciones_cercanas(lat, lon)


@router.get("/estaciones-mapa")
def estaciones_mapa(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return listar_estaciones_mapa(db)


@router.get("/estaciones-cercanas")
def estaciones_cercanas(
    latitud: float,
    longitud: float,
    radio_km: float = 25,
    db: Session = Depends(get_db),
):
    return listar_estaciones_mapa_cercanas(db, latitud, longitud, radio_km)


@router.get("/estaciones-bogota")
def estaciones_bogota(db: Session = Depends(get_db)):
    return listar_estaciones_mapa_bogota(db)
