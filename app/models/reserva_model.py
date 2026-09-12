# Backend/models/reserva_model.py
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.config.database import Base
from app.models.utils import generar_uuid, ahora_utc


class Reservas(Base):
    __tablename__ = "reservas"

    id = Column(String, primary_key=True, default=generar_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    estacion_ocm_id = Column(String, nullable=False, index=True)
    cargador_id = Column(String, nullable=True, index=True)
    estacion_nombre = Column(String, default="")
    fecha_hora_inicio = Column(DateTime, nullable=False)
    fecha_hora_fin = Column(DateTime, nullable=False)
    estado = Column(String, default="pendiente")  # pendiente | activa | rechazada | realizada | cancelada
    created_at = Column(DateTime, default=ahora_utc)

    usuario = relationship("usuarios", back_populates="reservas_rel")
