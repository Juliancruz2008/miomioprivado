# Backend/models/estacion_propia_model.py
from sqlalchemy import Column, String, Float, Boolean, DateTime
from app.config.database import Base
from app.models.utils import generar_uuid, ahora_utc


class EstacionPropia(Base):
    __tablename__ = "estaciones_propias"

    id = Column(String, primary_key=True, default=generar_uuid, index=True)
    nombre = Column(String, nullable=False)
    direccion = Column(String, nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    tipo_conector = Column(String, nullable=False)
    potencia_kw = Column(Float, nullable=False)
    descripcion = Column(String, nullable=True, default="")
    operador = Column(String, nullable=True, default="EV Charge")
    activa = Column(Boolean, default=True)
    estado = Column(String, nullable=False, default="activa")  # activa | mantenimiento | inactiva
    created_at = Column(DateTime, default=ahora_utc)