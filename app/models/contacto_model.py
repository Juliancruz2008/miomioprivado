from sqlalchemy import Column, DateTime, ForeignKey, String, Text

from app.config.database import Base
from app.models.utils import ahora_utc, generar_uuid


class Contacto(Base):
    __tablename__ = "contactos"

    id = Column(String, primary_key=True, default=generar_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=True, default="")
    correo = Column(String, nullable=False, index=True)
    mensaje = Column(Text, nullable=False)
    respuesta = Column(Text, nullable=True)
    estado = Column(String, nullable=False, default="pendiente")
    fecha_envio = Column(DateTime, nullable=False, default=ahora_utc)
    fecha_respuesta = Column(DateTime, nullable=True)