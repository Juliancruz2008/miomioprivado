# Backend/models/calificacion_model.py
from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.config.database import Base
from app.models.utils import generar_uuid, ahora_utc


class Calificaciones(Base):
    __tablename__ = "calificaciones"

    id = Column(String, primary_key=True, default=generar_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    estacion_ocm_id = Column(String, nullable=False, index=True)
    estacion_nombre = Column(String, default="")
    puntaje = Column(Integer, nullable=False)
    comentario = Column(Text, default="")
    fecha = Column(DateTime, default=ahora_utc)

    usuario = relationship("usuarios", back_populates="calificaciones_rel")