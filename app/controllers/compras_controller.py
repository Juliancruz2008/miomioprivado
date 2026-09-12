from sqlalchemy.orm import Session

from app.models.compra_model import Compras


def listar_compras(db: Session, usuario_id: str):
    return (
        db.query(Compras)
        .filter(Compras.usuario_id == usuario_id)
        .order_by(Compras.created_at.desc())
        .all()
    )
