# Backend/controllers/cargas_controller.py
import re
from sqlalchemy.orm import Session

from app.models.carga_model import Cargas
from app.models.reserva_model import Reservas
from app.schemas.cargas_schema import CargaCreate
from app.controllers.notificaciones_controller import crear_notificacion


def _costo_carga(db: Session, carga: Cargas) -> float:
    """Recupera el valor de reservas antiguas que fueron guardadas en cero."""
    if carga.costo_estimado:
        return float(carga.costo_estimado)
    coincidencia = re.search(r"reserva\s+([\w-]+)", carga.notas or "", re.IGNORECASE)
    if not coincidencia:
        return 0.0
    reserva = db.query(Reservas).filter(Reservas.id == coincidencia.group(1)).first()
    if not reserva:
        return 0.0
    horas = max(1, round((reserva.fecha_hora_fin - reserva.fecha_hora_inicio).total_seconds() / 3600))
    return float(horas * 5000)


def listar_cargas(db: Session, usuario_id: str):
    cargas = (
        db.query(Cargas)
        .filter(Cargas.usuario_id == usuario_id)
        .order_by(Cargas.fecha.desc())
        .all()
    )
    for carga in cargas:
        carga.costo_estimado = _costo_carga(db, carga)
    return cargas


def estadisticas_cargas(db: Session, usuario_id: str):
    cargas = db.query(Cargas).filter(Cargas.usuario_id == usuario_id, Cargas.estado == "validada").all()
    total_kwh = sum(c.kwh_cargados for c in cargas)
    total_costo = sum(_costo_carga(db, c) for c in cargas)
    return {
        "total_sesiones": len(cargas),
        "total_cargas": len(cargas),
        "total_kwh": round(total_kwh, 2),
        "total_costo": round(total_costo, 0),
    }


def crear_carga(db: Session, usuario_id: str, data: CargaCreate):
    carga = Cargas(usuario_id=usuario_id, estado="pendiente", **data.model_dump())
    db.add(carga)
    crear_notificacion(
        db,
        usuario_id,
        "Carga registrada",
        f"Registraste una carga de {data.kwh_cargados} kWh en {data.estacion_nombre or data.estacion_ocm_id}.",
        "sistema",
    )
    db.commit()
    db.refresh(carga)
    return carga
