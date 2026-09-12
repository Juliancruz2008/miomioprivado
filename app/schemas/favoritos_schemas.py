# Backend/schemas/favoritos_schemas.py
from pydantic import BaseModel
from typing import Optional


class FavoritoCreate(BaseModel):
    estacion_ocm_id: str
    estacion_nombre: Optional[str] = ""