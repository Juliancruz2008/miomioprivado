# Backend/routes/calificaciones_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.utils.jwt import get_current_user
from app.controllers.calificaciones_controller import (
    calificar,
    mis_calificaciones,
    actualizar_calificacion,
    eliminar_calificacion,
    calificaciones_estacion,
)
from app.schemas.calificaciones_schema import CalificacionCreate, CalificacionUpdate

# Sin prefix único: el contrato mezcla /calificaciones, /mis-calificaciones y /calificaciones/{estacion_id} (público)
router = APIRouter(tags=["Calificaciones"])


@router.post("/calificaciones")
def calificar_ruta(data: CalificacionCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return calificar(db, current_user.id, data)


@router.get("/mis-calificaciones")
def calificaciones_mias(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return mis_calificaciones(db, current_user.id)


@router.put("/calificaciones/{cid}")
def calificacion_actualizar(cid: str, data: CalificacionUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return actualizar_calificacion(db, current_user.id, cid, data)


@router.delete("/calificaciones/{cid}")
def calificacion_eliminar(cid: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return eliminar_calificacion(db, current_user.id, cid)


@router.get("/calificaciones/{estacion_id}")
def calificaciones_de_estacion(estacion_id: str, db: Session = Depends(get_db)):
    return calificaciones_estacion(db, estacion_id)