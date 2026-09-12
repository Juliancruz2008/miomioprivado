# Backend/routes/vehiculos_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.utils.jwt import get_current_user
from app.controllers.vehiculo_controller import (
    listar_vehiculos,
    crear_vehiculo,
    actualizar_vehiculo,
    eliminar_vehiculo,
)
from app.schemas.vehiculo_schema import VehiculoCreate, VehiculoUpdate, VehiculoOut

router = APIRouter(
    prefix="/vehiculos",
    tags=["Vehículos"]
)


@router.get("", response_model=list[VehiculoOut])
def vehiculos_listar(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return listar_vehiculos(db, current_user.id)


@router.post("")
def vehiculo_crear(data: VehiculoCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return crear_vehiculo(db, current_user.id, data)


@router.put("/{vid}")
def vehiculo_actualizar(vid: str, data: VehiculoUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return actualizar_vehiculo(db, current_user.id, vid, data)


@router.delete("/{vid}")
def vehiculo_eliminar(vid: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return eliminar_vehiculo(db, current_user.id, vid)