# Backend/routes/cargas_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.utils.jwt import get_current_user
from app.controllers.cargas_controller import (
    listar_cargas,
    estadisticas_cargas,
    crear_carga,
)
from app.schemas.cargas_schema import CargaCreate

router = APIRouter(prefix="/cargas", tags=["Cargas"])


@router.get("/estadisticas")
def cargas_estadisticas(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return estadisticas_cargas(db, current_user.id)


@router.get("")
def cargas_listar(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return listar_cargas(db, current_user.id)


@router.post("")
def cargas_crear(data: CargaCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return crear_carga(db, current_user.id, data)