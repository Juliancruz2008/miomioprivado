from sqlalchemy import Column, DateTime, Float, ForeignKey, String

from app.config.database import Base
from app.models.utils import ahora_utc, generar_uuid


class Compras(Base):
    __tablename__ = "compras"

    id = Column(String, primary_key=True, default=generar_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    producto = Column(String, nullable=False)
    monto = Column(Float, nullable=False)
    metodo = Column(String(50), nullable=False)
    metodo_id = Column(String, nullable=True)
    transaccion_id = Column(String(40), unique=True, nullable=False, index=True)
    estado = Column(String(20), nullable=False, default="aprobada")
    created_at = Column(DateTime, default=ahora_utc, nullable=False)
