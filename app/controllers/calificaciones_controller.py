# Backend/controllers/calificaciones_controller.py
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException

from app.models.calificacion_model import Calificaciones
from app.schemas.calificaciones_schema import CalificacionCreate, CalificacionUpdate
from app.controllers.notificaciones_controller import crear_notificacion
from app.utils.content_filter import validar_contenido


def calificar(db: Session, usuario_id: str, data: CalificacionCreate):
    if not (1 <= data.puntaje <= 5):
        raise HTTPException(status_code=400, detail="Puntaje entre 1 y 5")
    validar_contenido(data.comentario or "")

    existente = db.query(Calificaciones).filter(
        Calificaciones.usuario_id == usuario_id,
        Calificaciones.estacion_ocm_id == data.estacion_ocm_id,
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya calificaste esta estación. Puedes editar tu calificación existente.")

    cal = Calificaciones(usuario_id=usuario_id, **data.model_dump())
    db.add(cal)
    crear_notificacion(db, usuario_id, "Calificación enviada", f"Calificaste {data.estacion_nombre or data.estacion_ocm_id} con {data.puntaje}/5.", "calificacion")
    db.commit()
    return {"ok": True}


def mis_calificaciones(db: Session, usuario_id: str):
    return db.query(Calificaciones).filter(Calificaciones.usuario_id == usuario_id).order_by(Calificaciones.fecha.desc()).all()


def actualizar_calificacion(db: Session, usuario_id: str, cid: str, data: CalificacionUpdate):
    cal = db.query(Calificaciones).filter(Calificaciones.id == cid, Calificaciones.usuario_id == usuario_id).first()
    if not cal:
        raise HTTPException(status_code=404, detail="Calificación no encontrada")
    if not (1 <= data.puntaje <= 5):
        raise HTTPException(status_code=400, detail="Puntaje entre 1 y 5")
    validar_contenido(data.comentario or "")

    cal.puntaje = data.puntaje
    cal.comentario = data.comentario
    crear_notificacion(db, usuario_id, "Calificación actualizada", f"Actualizaste tu calificación de {cal.estacion_nombre or cal.estacion_ocm_id}.", "calificacion")
    db.commit()
    db.refresh(cal)
    return cal


def eliminar_calificacion(db: Session, usuario_id: str, cid: str):
    cal = db.query(Calificaciones).filter(Calificaciones.id == cid, Calificaciones.usuario_id == usuario_id).first()
    if not cal:
        raise HTTPException(status_code=404, detail="Calificación no encontrada")

    db.delete(cal)
    crear_notificacion(db, usuario_id, "Calificación eliminada", f"Eliminaste tu calificación de {cal.estacion_nombre or cal.estacion_ocm_id}.", "calificacion")
    db.commit()
    return {"ok": True}


def calificaciones_estacion(db: Session, estacion_id: str):
    cals = db.query(Calificaciones).options(joinedload(Calificaciones.usuario)).filter(Calificaciones.estacion_ocm_id == estacion_id).order_by(Calificaciones.fecha.desc()).all()
    promedio = round(sum(c.puntaje for c in cals) / len(cals), 1) if cals else 0
    return {
        "promedio": promedio,
        "total": len(cals),
        "calificaciones": [
            {
                "id": cal.id,
                "usuario_id": cal.usuario_id,
                "usuario_nombre": f"{cal.usuario.nombre} {cal.usuario.apellido or ''}".strip(),
                "puntaje": cal.puntaje,
                "comentario": cal.comentario or "",
                "fecha": cal.fecha,
            }
            for cal in cals
        ],
    }
