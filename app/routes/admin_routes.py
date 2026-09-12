# Backend/routes/admin_routes.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.utils.jwt import require_admin
from app.controllers import admin_controller as ctrl
from app.schemas.admin_schema import (
    AdminEstadisticas,
    EstacionPropiaCreate,
    EstacionPropiaUpdate,
    EstadoUpdate,
    AdminReservaUpdate,
    AdminReservaDetail,
    AdminReporteEstado,
    AdminEstacionOcmUpdate,
    AdminCargaUpdate,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/usuarios")
def admin_usuarios(
    busqueda: str | None = Query(default=None),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    return ctrl.listar_usuarios(db, busqueda)


@router.put("/usuarios/{uid}")
def admin_actualizar_usuario(uid: str, data: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.actualizar_usuario(uid, data, db)


@router.get("/estadisticas", response_model=AdminEstadisticas)
def admin_estadisticas(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.obtener_estadisticas(db)


@router.get("/reportes")
def admin_reportes(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.listar_reportes(db)


@router.patch("/reportes/{rid}/resolver")
def admin_resolver_reporte(rid: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.resolver_reporte(rid, db)


@router.patch("/reportes/{rid}/estado")
def admin_estado_reporte(rid: str, data: AdminReporteEstado, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.cambiar_estado_reporte(rid, data.estado, db)


@router.get("/estaciones")
def admin_estaciones(
    busqueda: str | None = Query(default=None),
    estado: str | None = Query(default=None),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    return ctrl.listar_estaciones(db, busqueda, estado)


@router.post("/estaciones")
def admin_crear_estacion(data: EstacionPropiaCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.crear_estacion(data, db)


@router.put("/estaciones/{eid}")
def admin_actualizar_estacion(eid: str, data: EstacionPropiaUpdate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.actualizar_estacion(eid, data, db)


@router.patch("/estaciones/{eid}/estado")
def admin_estado_estacion(eid: str, data: EstadoUpdate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.cambiar_estado_estacion(eid, data, db)


@router.patch("/estaciones-ocm/{eid}/estado")
def admin_estado_estacion_ocm(eid: str, data: EstadoUpdate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.cambiar_estado_estacion_ocm(eid, data, db)


@router.get("/estaciones-ocm")
def admin_estaciones_ocm(
    busqueda: str | None = Query(default=None),
    estado: str | None = Query(default=None),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    return ctrl.listar_estaciones_ocm_admin(db, busqueda, estado)


@router.put("/estaciones-ocm/{eid}")
def admin_actualizar_estacion_ocm(eid: str, data: AdminEstacionOcmUpdate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.actualizar_estacion_ocm(eid, data, db)


@router.delete("/estaciones-ocm/{eid}")
def admin_eliminar_estacion_ocm(eid: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.eliminar_estacion_ocm(eid, db)


@router.delete("/estaciones/{eid}")
def admin_eliminar_estacion(eid: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.eliminar_estacion(eid, db)


@router.get("/reservas", response_model=list[AdminReservaDetail])
def admin_reservas(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.listar_reservas(db)


@router.put("/reservas/{rid}")
def admin_actualizar_reserva(rid: str, data: AdminReservaUpdate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.actualizar_reserva(rid, data, db)


@router.delete("/reservas/{rid}")
def admin_eliminar_reserva(rid: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.eliminar_reserva(rid, db)


@router.get("/calificaciones")
def admin_calificaciones(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.listar_calificaciones(db)


@router.get("/cargas")
def admin_cargas(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.listar_cargas_admin(db)


@router.get("/notificaciones")
def admin_notificaciones(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.listar_notificaciones_admin(db)


@router.patch("/cargas/{cid}/estado")
def admin_estado_carga(cid: str, data: AdminCargaUpdate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return ctrl.actualizar_carga_admin(cid, data.estado, db)
