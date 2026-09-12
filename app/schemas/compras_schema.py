from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CompraOut(BaseModel):
    id: str
    producto: str
    monto: float
    metodo: str
    metodo_id: str | None = None
    transaccion_id: str
    estado: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
