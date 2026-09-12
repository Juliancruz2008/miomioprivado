import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.pago_schema import PagoCreateSchema, PagoResponseSchema
from app.utils.jwt import get_current_user  # <-- Importación corregida desde app.utils.jwt
from app.config.database import get_db
from app.controllers.notificaciones_controller import crear_notificacion
from app.models.metodo_pago_model import MetodosPago
from app.models.compra_model import Compras

router = APIRouter(
    prefix="/api/pagos",
    tags=["Pagos"]
)

@router.post("/procesar", response_model=PagoResponseSchema, status_code=status.HTTP_201_CREATED)
def procesar_pago(
    pago_in: PagoCreateSchema,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)  # Autenticación requerida
):
    """
    Procesa un pago de producto (cargador/wallbox) o cobro anticipado de reserva.
    """
    if pago_in.monto <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto a pagar debe ser mayor a 0."
        )

    if pago_in.metodo_id:
        metodo_guardado = db.query(MetodosPago).filter(
            MetodosPago.id == pago_in.metodo_id,
            MetodosPago.usuario_id == current_user.id,
            MetodosPago.estado.is_(True),
        ).first()
        if not metodo_guardado:
            raise HTTPException(status_code=400, detail="El método de pago seleccionado no es válido.")

    transaccion_id = f"TX-EV-{uuid.uuid4().hex[:10].upper()}"

    tipo = "compra" if pago_in.tipo_pago == "producto" else "pago"
    titulo = "Compra completada" if tipo == "compra" else "Pago realizado"
    crear_notificacion(
        db,
        current_user.id,
        titulo,
        f"Se aprobó el pago de ${pago_in.monto:,.0f} COP por {pago_in.item}.",
        tipo,
    )
    if pago_in.tipo_pago == "producto":
        db.add(Compras(
            usuario_id=current_user.id,
            producto=pago_in.item,
            monto=pago_in.monto,
            metodo=metodo_guardado.tipo if pago_in.metodo_id and metodo_guardado else pago_in.metodo,
            metodo_id=pago_in.metodo_id,
            transaccion_id=transaccion_id,
            estado="aprobada",
        ))
    db.commit()

    return {
        "id": 1,
        "transaccion_id": transaccion_id,
        "estado": "aprobado",
        "monto": pago_in.monto,
        "item": pago_in.item,
        "mensaje": f"Pago de ${pago_in.monto:,.0f} COP aprobado exitosamente para {current_user.nombre} mediante {pago_in.metodo.capitalize()}."
    }
