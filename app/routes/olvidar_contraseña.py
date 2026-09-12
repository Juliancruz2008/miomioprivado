import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.controllers.auth_controller import validar_password_fuerte
from app.models.usuario_model import usuarios
from app.schemas.olvidar_contraseña import ForgotPasswordSchema, VerifyPinSchema, ResetPasswordSchema
from app.utils.security import hash_password

router = APIRouter()
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError('SECRET_KEY es obligatoria y debe configurarse en el archivo .env')
ALGORITHM = os.getenv('ALGORITHM', 'HS256')

@router.post('/forgot-password')
def forgot_password(request: ForgotPasswordSchema, db: Session = Depends(get_db)):
    user = db.query(usuarios).filter(usuarios.email == request.email.strip().lower()).first()
    if not user:
        return {'message': 'Si el correo está registrado, se generará un PIN.'}
    pin = ''.join(str(secrets.randbelow(10)) for _ in range(6))
    user.reset_pin = pin
    user.reset_pin_expires = datetime.now() + timedelta(minutes=15)
    db.commit()
    return {'message': 'PIN generado correctamente.', 'dev_pin': pin}

@router.post('/verify-pin')
def verify_pin(request: VerifyPinSchema, db: Session = Depends(get_db)):
    user = db.query(usuarios).filter(usuarios.email == request.email.strip().lower()).first()
    if not user or not user.reset_pin:
        raise HTTPException(status_code=400, detail='Datos inválidos')
    if user.reset_pin.strip() != request.pin.strip():
        raise HTTPException(status_code=400, detail='El PIN es incorrecto')
    if user.reset_pin_expires and datetime.now() > user.reset_pin_expires.replace(tzinfo=None):
        raise HTTPException(status_code=400, detail='El PIN ha expirado')
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    reset_token = jwt.encode({'sub': user.email, 'exp': expire}, SECRET_KEY, algorithm=ALGORITHM)
    return {'message': 'PIN verificado correctamente', 'reset_token': reset_token}

@router.post('/reset-password')
def reset_password(request: ResetPasswordSchema, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(request.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get('sub')
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Token inválido')
    except jwt.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Token inválido o expirado')
    user = db.query(usuarios).filter(usuarios.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    validar_password_fuerte(request.new_password)
    user.password_hash = hash_password(request.new_password)
    user.reset_pin = None
    user.reset_pin_expires = None
    db.commit()
    return {'message': 'Contraseña actualizada exitosamente'}
