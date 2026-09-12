# Backend/controllers/favoritos_controller.py
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.favorito_model import Favoritos
from app.schemas.favoritos_schemas import FavoritoCreate
from app.controllers.notificaciones_controller import crear_notificacion


def listar_favoritos(db: Session, usuario_id: str):
    favoritos = db.query(Favoritos).filter(Favoritos.usuario_id == usuario_id).all()
    return [
        {"id": f.id, "estacion_ocm_id": f.estacion_ocm_id, "estacion_nombre": f.estacion_nombre}
        for f in favoritos
    ]


def agregar_favorito(db: Session, usuario_id: str, data: FavoritoCreate):
    existe = db.query(Favoritos).filter(
        Favoritos.usuario_id == usuario_id,
        Favoritos.estacion_ocm_id == data.estacion_ocm_id,
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="La estación ya está en tus favoritos.")

    db.add(Favoritos(usuario_id=usuario_id, **data.model_dump()))
    crear_notificacion(db, usuario_id, "Favorito agregado", f"Guardaste {data.estacion_nombre or data.estacion_ocm_id} en tus favoritos.", "favorito")
    db.commit()
    return {"ok": True}


def quitar_favorito(db: Session, usuario_id: str, estacion_id: str):
    fav = db.query(Favoritos).filter(
        Favoritos.usuario_id == usuario_id,
        Favoritos.estacion_ocm_id == estacion_id,
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="No encontrado")

    db.delete(fav)
    crear_notificacion(db, usuario_id, "Favorito eliminado", f"Quitaste {fav.estacion_nombre or fav.estacion_ocm_id} de tus favoritos.", "favorito")
    db.commit()
    return {"ok": True}