# Backend/schemas/vehiculo_schema.py
from pydantic import BaseModel
from typing import Optional


class VehiculoCreate(BaseModel):
    marca: str
    modelo: str
    anio: Optional[int] = None
    autonomia_km: float = 300
    tipo_conector: str
    activo: bool = True


class VehiculoOut(VehiculoCreate):
    id: str

    class Config:
        from_attributes = True


class VehiculoUpdate(BaseModel):
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anio: Optional[int] = None
    autonomia_km: Optional[float] = None
    tipo_conector: Optional[str] = None
    activo: Optional[bool] = None