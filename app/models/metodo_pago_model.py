# Backend/models/metodo_pago_model.py
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.config.database import Base
from app.models.utils import generar_uuid, ahora_utc


class MetodosPago(Base):
    __tablename__ = "metodos_pago"

    id = Column(String, primary_key=True, default=generar_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(30), nullable=False)
    numero = Column(String(30), nullable=False)
    estado = Column(Boolean, default=True)
    created_at = Column(DateTime, default=ahora_utc)

    usuario = relationship("usuarios", back_populates="metodos_pago_rel")