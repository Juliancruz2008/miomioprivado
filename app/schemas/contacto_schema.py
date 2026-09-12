from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ContactoCreate(BaseModel):
    nombre: str
    apellido: str = ""
    correo: str
    mensaje: str


class ContactoRespuesta(BaseModel):
    respuesta: str


class ContactoOut(BaseModel):
    id: str
    usuario_id: str | None
    nombre: str
    apellido: str | None
    correo: str
    mensaje: str
    respuesta: str | None
    estado: str
    fecha_envio: datetime
    fecha_respuesta: datetime | None

    model_config = ConfigDict(from_attributes=True)