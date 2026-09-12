# Backend/controllers/reportes_controller.py
from datetime import timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.reporte_model import Reportes
from app.models.utils import ahora_utc
from app.schemas.reportes_schema import ReporteCreate, ReporteUpdate
from app.controllers.notificaciones_controller import crear_notificacion
from app.utils.content_filter import validar_contenido


def crear_reporte(db: Session, usuario_id: str, data: ReporteCreate):
    validar_contenido(data.descripcion or "")
    cinco_min = ahora_utc() - timedelta(minutes=5)
    reciente = db.query(Reportes).filter(
        Reportes.usuario_id == usuario_id,
        Reportes.estacion_ocm_id == data.estacion_ocm_id,
        Reportes.tipo == data.tipo,
        Reportes.fecha >= cinco_min,
        Reportes.estado == "abierto",
    ).first()
    if reciente:
        raise HTTPException(status_code=400, detail="Ya reportaste esta estación con el mismo tipo hace menos de 5 minutos")

    rep = Reportes(usuario_id=usuario_id, **data.model_dump())
    db.add(rep)
    crear_notificacion(db, usuario_id, "Reporte enviado", f"Reportaste {data.estacion_nombre or data.estacion_ocm_id}: {data.tipo}.", "reporte")
    db.commit()
    db.refresh(rep)
    return rep


def mis_reportes(db: Session, usuario_id: str):
    return db.query(Reportes).filter(Reportes.usuario_id == usuario_id).order_by(Reportes.fecha.desc()).all()


def actualizar_reporte(db: Session, usuario_id: str, rid: str, data: ReporteUpdate):
    reporte = db.query(Reportes).filter(Reportes.id == rid, Reportes.usuario_id == usuario_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if reporte.estado != "abierto":
        raise HTTPException(status_code=403, detail="Solo se pueden editar reportes abiertos")
    validar_contenido(data.descripcion or "")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(reporte, key, value)

    crear_notificacion(db, usuario_id, "Reporte actualizado", f"Actualizaste el reporte de {reporte.estacion_nombre or reporte.estacion_ocm_id}.", "reporte")
    db.commit()
    db.refresh(reporte)
    return reporte


def eliminar_reporte(db: Session, usuario_id: str, rid: str):
    reporte = db.query(Reportes).filter(Reportes.id == rid, Reportes.usuario_id == usuario_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if reporte.estado != "abierto":
        raise HTTPException(status_code=403, detail="Solo se pueden eliminar reportes abiertos")

    db.delete(reporte)
    crear_notificacion(db, usuario_id, "Reporte eliminado", f"Eliminaste el reporte de {reporte.estacion_nombre or reporte.estacion_ocm_id}.", "reporte")
    db.commit()
    return {"ok": True}


def reportes_estacion(db: Session, estacion_id: str):
    return (
        db.query(Reportes)
        .filter(Reportes.estacion_ocm_id == estacion_id, Reportes.estado == "abierto")
        .order_by(Reportes.fecha.desc())
        .limit(10)
        .all()
    )
