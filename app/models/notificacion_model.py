from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text

from app.config.database import Base
from app.models.utils import ahora_utc, generar_uuid


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(String, primary_key=True, default=generar_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    titulo = Column(String, nullable=False)
    mensaje = Column(Text, nullable=False)
    tipo = Column(String, nullable=False, default="sistema")
    leida = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=ahora_utc)