# Backend/schemas/metodos_pago_schema.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MetodoPagoCreate(BaseModel):
    tipo: str
    numero: str
    estado: Optional[bool] = True


class MetodoPagoUpdate(BaseModel):
    tipo: Optional[str] = None
    numero: Optional[str] = None
    estado: Optional[bool] = None


class MetodoPagoOut(BaseModel):
    id: str
    usuario_id: str
    tipo: str
    numero: str
    estado: bool
    created_at: datetime

    class Config:
        from_attributes = True