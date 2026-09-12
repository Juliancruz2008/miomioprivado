# Backend/schemas/calificaciones_schema.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CalificacionCreate(BaseModel):
    estacion_ocm_id: str
    estacion_nombre: Optional[str] = ""
    puntaje: int
    comentario: Optional[str] = ""


class CalificacionUpdate(BaseModel):
    puntaje: int
    comentario: Optional[str] = None


class CalificacionPublica(BaseModel):
    id: str
    usuario_id: str
    usuario_nombre: str
    puntaje: int
    comentario: str
    fecha: datetime

    class Config:
        from_attributes = True