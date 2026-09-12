from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificacionOut(BaseModel):
    id: str
    titulo: str
    mensaje: str
    tipo: str
    leida: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)