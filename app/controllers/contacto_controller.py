from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.controllers.notificaciones_controller import crear_notificacion
from app.models.contacto_model import Contacto
from app.models.usuario_model import usuarios
from app.models.utils import ahora_utc


def crear_contacto(db: Session, data, usuario=None):
    contacto = Contacto(
        usuario_id=usuario.id if usuario else None,
        nombre=data.nombre.strip(),
        apellido=data.apellido.strip(),
        correo=data.correo.strip().lower(),
        mensaje=data.mensaje.strip(),
    )
    if not contacto.nombre or not contacto.correo or not contacto.mensaje:
        raise HTTPException(status_code=400, detail="Completa todos los campos del contacto.")
    db.add(contacto)
    db.commit()
    db.refresh(contacto)
    return contacto


def listar_contactos(db: Session):
    return db.query(Contacto).order_by(Contacto.fecha_envio.desc()).all()


def responder_contacto(db: Session, cid: str, respuesta: str):
    contacto = db.query(Contacto).filter(Contacto.id == cid).first()
    if not contacto:
        raise HTTPException(status_code=404, detail="Mensaje de contacto no encontrado.")
    if contacto.respuesta and contacto.respuesta.strip():
        raise HTTPException(status_code=400, detail="Este mensaje de contacto ya fue respondido.")
    respuesta = respuesta.strip()
    if not respuesta:
        raise HTTPException(status_code=400, detail="La respuesta no puede estar vacía.")
    contacto.respuesta = respuesta
    contacto.estado = "respondido"
    contacto.fecha_respuesta = ahora_utc()
    usuario = db.query(usuarios).filter(usuarios.id == contacto.usuario_id).first() if contacto.usuario_id else db.query(usuarios).filter(usuarios.email == contacto.correo).first()
    if usuario:
        crear_notificacion(db, usuario.id, "Respuesta de contacto", respuesta, "sistema")
    db.commit()
    db.refresh(contacto)
    return contacto
