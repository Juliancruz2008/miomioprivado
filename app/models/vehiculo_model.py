# Backend/models/vehiculo_model.py
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.config.database import Base
from app.models.utils import generar_uuid, ahora_utc


class vehiculos(Base):
    __tablename__ = "vehiculos"

    id = Column(String, primary_key=True, default=generar_uuid, index=True)
    usuario_id = Column(String, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    marca = Column(String, nullable=False)
    modelo = Column(String, nullable=False)
    anio = Column(Integer, nullable=True)
    autonomia_km = Column(Float, default=300.0)
    tipo_conector = Column(String, nullable=False)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=ahora_utc)

    dueno = relationship("usuarios", back_populates="vehiculos_rel")