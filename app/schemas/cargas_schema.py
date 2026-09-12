# Backend/schemas/cargas_schema.py
from pydantic import BaseModel
from typing import Optional


class CargaCreate(BaseModel):
    estacion_ocm_id: str
    estacion_nombre: Optional[str] = ""
    kwh_cargados: float
    costo_estimado: float
    notas: Optional[str] = ""