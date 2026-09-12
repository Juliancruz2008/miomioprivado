# Backend/routes/reportes_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.utils.jwt import get_current_user
from app.controllers.reportes_controller import (
    crear_reporte,
    mis_reportes,
    actualizar_reporte,
    eliminar_reporte,
    reportes_estacion,
)
from app.schemas.reportes_schema import ReporteCreate, ReporteUpdate

# Sin prefix único: el contrato mezcla /reportes, /mis-reportes y /reportes/{estacion_id} (público)
router = APIRouter(tags=["Reportes"])


@router.post("/reportes")
def reportar(data: ReporteCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return crear_reporte(db, current_user.id, data)


@router.get("/mis-reportes")
def reportes_mios(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return mis_reportes(db, current_user.id)


@router.put("/reportes/{rid}")
def reporte_actualizar(rid: str, data: ReporteUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return actualizar_reporte(db, current_user.id, rid, data)


@router.delete("/reportes/{rid}")
def reporte_eliminar(rid: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return eliminar_reporte(db, current_user.id, rid)


@router.get("/reportes/{estacion_id}")
def reportes_de_estacion(estacion_id: str, db: Session = Depends(get_db)):
    return reportes_estacion(db, estacion_id)