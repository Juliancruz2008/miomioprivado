# Backend/models/carga_model.py
from sqlalchemy import Column, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.config.database import Base
from app.models.utils import generar_uuid, ahora_utc


class Cargas(Base):
    __tablename__ = "cargas"

    id = Column(String, primary_key=True, default=generar_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    estacion_ocm_id = Column(String, nullable=False)
    cargador_id = Column(String, nullable=True, index=True)
    estacion_nombre = Column(String, default="")
    kwh_cargados = Column(Float, nullable=False)
    costo_estimado = Column(Float, nullable=False)
    notas = Column(Text, default="")
    estado = Column(String, nullable=False, default="pendiente")  # pendiente | validada | rechazada
    fecha = Column(DateTime, default=ahora_utc)

    usuario = relationship("usuarios", back_populates="cargas_rel")
