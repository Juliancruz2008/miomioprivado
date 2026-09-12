# Backend/models/reporte_model.py
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.config.database import Base
from app.models.utils import generar_uuid, ahora_utc


class Reportes(Base):
    __tablename__ = "reportes"

    id = Column(String, primary_key=True, default=generar_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    estacion_ocm_id = Column(String, nullable=False, index=True)
    estacion_nombre = Column(String, default="")
    tipo = Column(String, nullable=False)  # averia | fuera_servicio | otro
    descripcion = Column(Text, default="")
    estado = Column(String, default="abierto")  # abierto | mantenimiento | resuelto | fuera_servicio
    fecha = Column(DateTime, default=ahora_utc)

    usuario = relationship("usuarios", back_populates="reportes_rel")
