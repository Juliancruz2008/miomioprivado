# Backend/controllers/metodo_pago_controller.py
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.metodo_pago_model import MetodosPago
from app.schemas.metodos_pago_schema import MetodoPagoCreate, MetodoPagoUpdate
from app.controllers.notificaciones_controller import crear_notificacion


def listar_pagos(db: Session, usuario_id: str):
    return db.query(MetodosPago).filter(MetodosPago.usuario_id == usuario_id).all()


def obtener_pago(db: Session, usuario_id: str, pid: str):
    pago = db.query(MetodosPago).filter(
        MetodosPago.id == pid, MetodosPago.usuario_id == usuario_id
    ).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado.")
    return pago


def crear_pago(db: Session, usuario_id: str, data: MetodoPagoCreate):
    existente = db.query(MetodosPago).filter(
        MetodosPago.usuario_id == usuario_id, MetodosPago.numero == data.numero
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya tienes registrado ese método de pago.")

    nuevo = MetodosPago(usuario_id=usuario_id, **data.model_dump())
    db.add(nuevo)
    crear_notificacion(db, usuario_id, "Método de pago agregado", f"Agregaste un método de pago terminado en {data.numero[-4:]}.", "pago")
    db.commit()
    db.refresh(nuevo)
    return nuevo


def actualizar_pago(db: Session, usuario_id: str, pid: str, data: MetodoPagoUpdate):
    pago = obtener_pago(db, usuario_id, pid)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pago, key, value)
    crear_notificacion(db, usuario_id, "Método de pago actualizado", f"Actualizaste tu método de pago terminado en {pago.numero[-4:]}.", "pago")
    db.commit()
    db.refresh(pago)
    return pago


def eliminar_pago(db: Session, usuario_id: str, pid: str):
    pago = obtener_pago(db, usuario_id, pid)
    db.delete(pago)
    crear_notificacion(db, usuario_id, "Método de pago eliminado", f"Eliminaste tu método de pago terminado en {pago.numero[-4:]}.", "pago")
    db.commit()
    return {"ok": True}