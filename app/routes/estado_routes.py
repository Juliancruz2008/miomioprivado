# Backend/routes/estado_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.controllers.estado_controller import obtener_estado_estacion

router = APIRouter(tags=["Estado de estación"])


@router.get("/estado/{estacion_id}")
def estado_estacion(estacion_id: str, db: Session = Depends(get_db)):
    return obtener_estado_estacion(db, estacion_id)