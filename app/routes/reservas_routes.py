# Backend/routes/reservas_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.utils.jwt import get_current_user
from app.controllers.reservas_controller import (
    listar_mis_reservas,
    crear_reserva,
    actualizar_reserva,
    cancelar_reserva,
    eliminar_reserva,
)
from app.schemas.reservas_schemas import ReservaCreate, ReservaUpdate, ReservaCotizacion
from app.services.tarifas_service import calcular_precio_reserva

# Sin prefix único: el contrato del frontend mezcla /mis-reservas, /reservar y /reservas/{rid}
router = APIRouter(tags=["Reservas"])


@router.post("/reservas/cotizar")
def cotizar_reserva(data: ReservaCotizacion, current_user=Depends(get_current_user)):
    return calcular_precio_reserva(
        data.estacion_nombre,
        data.operador,
        data.tipo_cargador,
        data.potencia_kw,
        data.duracion_horas,
    )


@router.get("/mis-reservas")
def mis_reservas(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return listar_mis_reservas(db, current_user.id)


@router.post("/reservar")
def reservar(data: ReservaCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return crear_reserva(db, current_user.id, data)


@router.post("/reservar-confirmada")
def reservar_confirmada(data: ReservaCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Crea una reserva activa únicamente después de un pago aprobado."""
    return crear_reserva(db, current_user.id, data, estado="activa")


@router.put("/reservas/{rid}")
def reserva_actualizar(rid: str, data: ReservaUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return actualizar_reserva(db, current_user.id, rid, data)


@router.patch("/reservas/{rid}/cancelar")
def reserva_cancelar(rid: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return cancelar_reserva(db, current_user.id, rid)


@router.delete("/reservas/{rid}")
def reserva_eliminar(rid: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return eliminar_reserva(db, current_user.id, rid)
