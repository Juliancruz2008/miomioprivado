# Backend/controllers/vehiculo_controller.py
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.vehiculo_model import vehiculos
from app.schemas.vehiculo_schema import VehiculoCreate, VehiculoUpdate
from app.controllers.notificaciones_controller import crear_notificacion


def listar_vehiculos(db: Session, usuario_id: str):
    return db.query(vehiculos).filter(vehiculos.usuario_id == usuario_id).all()


def crear_vehiculo(db: Session, usuario_id: str, data: VehiculoCreate):
    existente = db.query(vehiculos).filter(
        vehiculos.usuario_id == usuario_id,
        vehiculos.marca == data.marca,
        vehiculos.modelo == data.modelo,
        vehiculos.tipo_conector == data.tipo_conector,
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya tienes un vehículo con esa marca, modelo y conector")

    if data.activo:
        db.query(vehiculos).filter(vehiculos.usuario_id == usuario_id).update({"activo": False})

    v = vehiculos(usuario_id=usuario_id, **data.model_dump())
    db.add(v)
    crear_notificacion(db, usuario_id, "Vehículo registrado", f"Registraste el vehículo {v.marca} {v.modelo}.", "vehiculo")
    db.commit()
    db.refresh(v)
    return v


def actualizar_vehiculo(db: Session, usuario_id: str, vid: str, data: VehiculoUpdate):
    v = db.query(vehiculos).filter(vehiculos.id == vid, vehiculos.usuario_id == usuario_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(v, key, value)

    if data.activo is True:
        db.query(vehiculos).filter(vehiculos.usuario_id == usuario_id, vehiculos.id != vid).update({"activo": False})

    crear_notificacion(db, usuario_id, "Vehículo actualizado", f"Actualizaste el vehículo {v.marca} {v.modelo}.", "vehiculo")
    db.commit()
    db.refresh(v)
    return v


def eliminar_vehiculo(db: Session, usuario_id: str, vid: str):
    v = db.query(vehiculos).filter(vehiculos.id == vid, vehiculos.usuario_id == usuario_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    db.delete(v)
    crear_notificacion(db, usuario_id, "Vehículo eliminado", f"Eliminaste el vehículo {v.marca} {v.modelo}.", "vehiculo")
    db.commit()
    return {"ok": True}