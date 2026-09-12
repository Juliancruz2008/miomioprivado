# Backend/controllers/reservas_controller.py
from datetime import timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.reserva_model import Reservas
from app.models.estacion_propia_model import EstacionPropia
from app.models.estado_estacion_model import EstadoEstacion
from app.models.utils import ahora_utc
from app.schemas.reservas_schemas import ReservaCreate, ReservaUpdate
from app.controllers.notificaciones_controller import crear_notificacion


def _aware(dt):
    """Si el datetime viene sin zona horaria (naive), se asume UTC para poder compararlo
    con seguridad. Evita el error 'can't compare offset-naive and offset-aware datetime'
    cuando el frontend manda fechas sin sufijo de timezone (ej: '2026-08-20T10:00:00')."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _nombre_completo(usuario) -> str:
    if not usuario:
        return "Usuario eliminado"
    if usuario.apellido and usuario.apellido.strip():
        return f"{usuario.nombre} {usuario.apellido}"
    return usuario.nombre


def listar_mis_reservas(db: Session, usuario_id: str):
    return (
        db.query(Reservas)
        .filter(Reservas.usuario_id == usuario_id)
        .order_by(Reservas.fecha_hora_inicio.asc())
        .all()
    )


def crear_reserva(db: Session, usuario_id: str, data: ReservaCreate, estado: str = "pendiente"):
    if estado not in {"pendiente", "activa"}:
        raise HTTPException(status_code=400, detail="Estado de reserva no válido")
    if _aware(data.fecha_hora_inicio) >= _aware(data.fecha_hora_fin):
        raise HTTPException(status_code=400, detail="Inicio debe ser anterior a Fin")
    if _aware(data.fecha_hora_inicio) < ahora_utc():
        raise HTTPException(status_code=400, detail="No se puede reservar en el pasado")

    estado_externo = db.query(EstadoEstacion).filter(EstadoEstacion.estacion_ocm_id == data.estacion_ocm_id).first()
    estacion_propia = db.query(EstacionPropia).filter(EstacionPropia.id == data.estacion_ocm_id).first()
    estado_estacion = estado_externo.estado if estado_externo else (estacion_propia.estado if estacion_propia else "activa")
    if estado_estacion in {"mantenimiento", "inactiva"}:
        raise HTTPException(status_code=400, detail="Esta estación no está disponible para reservar")

    cargador_id = data.cargador_id or f"{data.estacion_ocm_id}-general"
    existente = db.query(Reservas).filter(
        Reservas.usuario_id == usuario_id,
        Reservas.estacion_ocm_id == data.estacion_ocm_id,
        Reservas.cargador_id == cargador_id,
        Reservas.fecha_hora_inicio == data.fecha_hora_inicio,
        Reservas.fecha_hora_fin == data.fecha_hora_fin,
        Reservas.estado.in_(("pendiente", "activa")),
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya tienes una reserva activa para este cargador en ese horario")

    solapada = db.query(Reservas).filter(
        Reservas.estacion_ocm_id == data.estacion_ocm_id,
        Reservas.cargador_id == cargador_id,
        Reservas.estado == "activa",
        Reservas.fecha_hora_inicio < data.fecha_hora_fin,
        Reservas.fecha_hora_fin > data.fecha_hora_inicio,
        Reservas.usuario_id != usuario_id,
    ).first()
    if solapada:
        nombre = _nombre_completo(solapada.usuario)
        raise HTTPException(
            status_code=400,
            detail=f"Cargador ya reservado por {nombre} de {solapada.fecha_hora_inicio.strftime('%H:%M')} a {solapada.fecha_hora_fin.strftime('%H:%M')}",
        )

    datos = data.model_dump()
    datos["cargador_id"] = cargador_id
    datos["estado"] = estado
    reserva = Reservas(usuario_id=usuario_id, **datos)
    db.add(reserva)
    crear_notificacion(
        db,
        usuario_id,
        "Reserva aceptada" if estado == "activa" else "Solicitud de reserva recibida",
        f"Tu reserva de {data.estacion_nombre or data.estacion_ocm_id} fue aceptada después del pago." if estado == "activa" else f"Recibimos tu solicitud para {data.estacion_nombre or data.estacion_ocm_id}. Está pendiente de revisión por el administrador.",
        "reserva",
    )
    db.commit()
    db.refresh(reserva)
    return reserva


def actualizar_reserva(db: Session, usuario_id: str, rid: str, data: ReservaUpdate):
    reserva = db.query(Reservas).filter(Reservas.id == rid, Reservas.usuario_id == usuario_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if reserva.estado != "pendiente":
        raise HTTPException(status_code=400, detail="Solo se pueden editar solicitudes pendientes")

    datos = data.model_dump(exclude_unset=True)
    if not datos:
        return reserva

    inicio = datos.get("fecha_hora_inicio") or reserva.fecha_hora_inicio
    fin = datos.get("fecha_hora_fin") or reserva.fecha_hora_fin

    if _aware(inicio) >= _aware(fin):
        raise HTTPException(status_code=400, detail="Inicio debe ser anterior a Fin")

    if _aware(inicio) < ahora_utc():
        raise HTTPException(status_code=400, detail="No se puede reservar en el pasado")

    estacion_id = datos.get("estacion_ocm_id") or reserva.estacion_ocm_id
    cargador_id = datos.get("cargador_id") or reserva.cargador_id or f"{estacion_id}-general"
    if not estacion_id:
        raise HTTPException(status_code=400, detail="La estación es obligatoria")

    solapada = (
        db.query(Reservas)
        .filter(
            Reservas.id != rid,
            Reservas.estacion_ocm_id == estacion_id,
            Reservas.cargador_id == cargador_id,
            Reservas.estado == "activa",
            Reservas.fecha_hora_inicio < fin,
            Reservas.fecha_hora_fin > inicio,
            Reservas.usuario_id != usuario_id,
        )
        .first()
    )
    if solapada:
        nombre = _nombre_completo(solapada.usuario)
        raise HTTPException(
            status_code=400,
            detail=f"Cargador ya reservado por {nombre} de {solapada.fecha_hora_inicio.strftime('%H:%M')} a {solapada.fecha_hora_fin.strftime('%H:%M')}",
        )

    for key, value in datos.items():
        setattr(reserva, key, value)
    reserva.cargador_id = cargador_id

    crear_notificacion(db, usuario_id, "Reserva actualizada", f"Actualizaste tu reserva de {reserva.estacion_nombre or reserva.estacion_ocm_id}.", "reserva")
    db.commit()
    db.refresh(reserva)
    return reserva


def cancelar_reserva(db: Session, usuario_id: str, rid: str):
    reserva = db.query(Reservas).filter(Reservas.id == rid, Reservas.usuario_id == usuario_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if reserva.estado in {"realizada", "cancelada", "rechazada"}:
        raise HTTPException(status_code=400, detail="Esta reserva ya no se puede cancelar")
    reserva.estado = "cancelada"
    crear_notificacion(db, usuario_id, "Reserva cancelada", f"Cancelaste tu reserva de {reserva.estacion_nombre or reserva.estacion_ocm_id}.", "reserva")
    db.commit()
    return {"ok": True}


def eliminar_reserva(db: Session, usuario_id: str, rid: str):
    reserva = db.query(Reservas).filter(Reservas.id == rid, Reservas.usuario_id == usuario_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if reserva.estado != "realizada":
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar reservas realizadas")
    db.delete(reserva)
    crear_notificacion(db, usuario_id, "Reserva eliminada", f"Eliminaste tu reserva de {reserva.estacion_nombre or reserva.estacion_ocm_id}.", "reserva")
    db.commit()
    return {"ok": True}
