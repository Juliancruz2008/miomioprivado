from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.controllers.contacto_controller import crear_contacto, listar_contactos, responder_contacto
from app.schemas.contacto_schema import ContactoCreate, ContactoOut, ContactoRespuesta
from app.utils.jwt import require_admin

router = APIRouter(tags=["Contacto"])


@router.post("/contacto", response_model=ContactoOut)
def contacto_crear(data: ContactoCreate, db: Session = Depends(get_db)):
    return crear_contacto(db, data)


@router.get("/admin/contactos", response_model=list[ContactoOut])
def contactos_admin(admin=Depends(require_admin), db: Session = Depends(get_db)):
    return listar_contactos(db)


@router.patch("/admin/contactos/{cid}/respuesta", response_model=ContactoOut)
def contacto_responder(cid: str, data: ContactoRespuesta, admin=Depends(require_admin), db: Session = Depends(get_db)):
    return responder_contacto(db, cid, data.respuesta)