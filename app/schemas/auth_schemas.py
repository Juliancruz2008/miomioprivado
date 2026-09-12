# Backend/schemas/auth_schema.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UsuarioRegistro(BaseModel):
    nombre: str
    apellido: Optional[str] = ""
    email: EmailStr
    password: str


class UsuarioOut(BaseModel):
    id: str
    nombre: str
    apellido: Optional[str] = ""
    email: EmailStr
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioOut


class PerfilUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str
