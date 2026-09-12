# Backend/routes/auth_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.config.database import get_db
from app.utils.jwt import get_current_user
from app.controllers.auth_controller import (
    register_user,
    login_user,
    obtener_perfil,
    actualizar_perfil,
    cambiar_password,
    demo_login_user,
)
from app.schemas.auth_schemas import (
    UsuarioRegistro,
    TokenOut,
    PerfilUpdate,
    PasswordUpdate,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/registro", response_model=TokenOut)
def registro(
    data: UsuarioRegistro,
    db: Session = Depends(get_db)
):
    return register_user(db, data.nombre, data.apellido, data.email, data.password)


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return login_user(db, form.username, form.password)


@router.post("/demo", response_model=TokenOut)
def demo_login(db: Session = Depends(get_db)):
    return demo_login_user(db)


@router.get("/perfil")
def perfil(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return obtener_perfil(current_user, db)


@router.put("/perfil")
def perfil_actualizar(
    data: PerfilUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return actualizar_perfil(current_user, data, db)


@router.put("/password")
def password_actualizar(
    data: PasswordUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return cambiar_password(current_user, data, db)
