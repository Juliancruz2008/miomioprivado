# Backend/models/favorito_model.py
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.config.database import Base
from app.models.utils import generar_uuid, ahora_utc


class Favoritos(Base):
    __tablename__ = "favoritos"

    id = Column(String, primary_key=True, default=generar_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    estacion_ocm_id = Column(String, nullable=False)
    estacion_nombre = Column(String, default="")
    fecha = Column(DateTime, default=ahora_utc)

    usuario = relationship("usuarios", back_populates="favoritos_rel")