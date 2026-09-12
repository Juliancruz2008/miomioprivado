from sqlalchemy import Boolean, Column, Float, String, UniqueConstraint

from app.config.database import Base
from app.models.utils import generar_uuid


class EstadoEstacion(Base):
    __tablename__ = "estados_estaciones"
    __table_args__ = (UniqueConstraint("estacion_ocm_id", name="uq_estado_estacion_ocm_id"),)

    id = Column(String, primary_key=True, default=generar_uuid)
    estacion_ocm_id = Column(String, nullable=False, index=True)
    estado = Column(String, nullable=False, default="activa")
    nombre = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    operador = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    eliminada = Column(Boolean, nullable=False, default=False)