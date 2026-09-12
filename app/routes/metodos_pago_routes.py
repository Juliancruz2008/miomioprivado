# Backend/routes/metodos_pago_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.utils.jwt import get_current_user
from app.controllers.metodo_pago_controller import (
    listar_pagos,
    crear_pago,
    actualizar_pago,
    eliminar_pago,
)
from app.schemas.metodos_pago_schema import MetodoPagoCreate, MetodoPagoUpdate

router = APIRouter(prefix="/pagos", tags=["Métodos de Pago"])


@router.get("")
def pagos_listar(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return listar_pagos(db, current_user.id)


@router.post("")
def pagos_crear(data: MetodoPagoCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return crear_pago(db, current_user.id, data)


@router.put("/{pid}")
def pagos_actualizar(pid: str, data: MetodoPagoUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return actualizar_pago(db, current_user.id, pid, data)


@router.delete("/{pid}")
def pagos_eliminar(pid: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return eliminar_pago(db, current_user.id, pid)