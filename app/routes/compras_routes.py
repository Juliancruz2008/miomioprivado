from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.controllers.compras_controller import listar_compras
from app.schemas.compras_schema import CompraOut
from app.utils.jwt import get_current_user

router = APIRouter(prefix="/compras", tags=["Compras"])


@router.get("", response_model=list[CompraOut])
def compras_listar(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return listar_compras(db, current_user.id)
