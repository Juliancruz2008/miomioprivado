# Backend/controllers/auth_controller.py
import re
import os
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.usuario_model import usuarios
from app.utils.security import hash_password, verify_password
from app.utils.jwt import create_access_token
from app.controllers.notificaciones_controller import crear_notificacion


def validar_password_fuerte(password: str):
    """Verifica que la contraseña cumpla con los requisitos de seguridad."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres.")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos una letra mayúscula.")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos una letra minúscula.")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos un número.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=]", password):
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos un símbolo o carácter especial.")


def register_user(db: Session, nombre: str, apellido: str, email: str, password: str):
    email = email.strip().lower()
    existe = db.query(usuarios).filter(usuarios.email == email).first()
    if existe:
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")

    # Validar la contraseña en el backend al registrarse
    validar_password_fuerte(password)

    nuevo_usuario = usuarios(
        nombre=nombre.strip(),
        apellido=(apellido or "").strip(),
        email=email,
        password_hash=hash_password(password),
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return {
        "access_token": "",
        "token_type": "bearer",
        "usuario": nuevo_usuario,
    }


def login_user(db: Session, email: str, password: str):
    usuario = db.query(usuarios).filter(usuarios.email == email.strip().lower()).first()
    if not usuario or not verify_password(password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_access_token({"sub": usuario.id})
    return {"access_token": token, "token_type": "bearer", "usuario": usuario}


def demo_login_user(db: Session):
    """Obtiene una sesión de desarrollo para probar la app sin formulario de login."""
    if os.getenv("ENABLE_DEMO_AUTH", "true").lower() not in {"1", "true", "yes"}:
        raise HTTPException(status_code=404, detail="La sesión demo está desactivada.")

    email = "demo@evcharge.com"
    usuario = db.query(usuarios).filter(usuarios.email == email).first()
    if not usuario:
        usuario = usuarios(
            nombre="Usuario",
            apellido="Demo",
            email=email,
            password_hash=hash_password("DemoEVCharge#2026"),
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)

    token = create_access_token({"sub": usuario.id})
    return {"access_token": token, "token_type": "bearer", "usuario": usuario}


def obtener_perfil(current_user, db: Session):
    from app.models.vehiculo_model import vehiculos

    db.refresh(current_user)
    vehiculo_activo = (
        db.query(vehiculos)
        .filter(vehiculos.usuario_id == current_user.id, vehiculos.activo == True)
        .first()
    )
    return {"usuario": current_user, "vehiculo_activo": vehiculo_activo}


def actualizar_perfil(current_user, data, db: Session):
    if data.nombre and data.nombre.strip():
        current_user.nombre = data.nombre.strip()
    if data.apellido is not None:
        current_user.apellido = data.apellido.strip()
    if data.email and str(data.email).strip():
        ocupado = (
            db.query(usuarios)
            .filter(usuarios.email == data.email, usuarios.id != current_user.id)
            .first()
        )
        if ocupado:
            raise HTTPException(status_code=400, detail="El correo ya está registrado por otro usuario.")
        current_user.email = data.email

    crear_notificacion(db, current_user.id, "Perfil actualizado", "Actualizaste tus datos personales.", "sistema")
    db.commit()
    db.refresh(current_user)
    return {"usuario": current_user}


def cambiar_password(current_user, data, db: Session):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")

    # Validar que la nueva contraseña sea fuerte
    validar_password_fuerte(data.new_password)

    current_user.password_hash = hash_password(data.new_password)
    crear_notificacion(db, current_user.id, "Contraseña actualizada", "Tu contraseña fue actualizada correctamente.", "sistema")
    db.commit()
    return {"ok": True}
