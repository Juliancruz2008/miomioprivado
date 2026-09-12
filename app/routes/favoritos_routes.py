# Backend/routes/favoritos_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.utils.jwt import get_current_user
from app.controllers.favoritos_controller import (
    listar_favoritos,
    agregar_favorito,
    quitar_favorito,
)
from app.schemas.favoritos_schemas import FavoritoCreate

router = APIRouter(prefix="/favoritos", tags=["Favoritos"])


@router.get("")
def favoritos_listar(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return listar_favoritos(db, current_user.id)


@router.post("")
def favoritos_agregar(data: FavoritoCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return agregar_favorito(db, current_user.id, data)


@router.delete("/{estacion_id}")
def favoritos_quitar(estacion_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return quitar_favorito(db, current_user.id, estacion_id)