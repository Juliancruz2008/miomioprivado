# Backend/models/usuario_model.py
from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.orm import relationship
from app.config.database import Base
from app.models.utils import generar_uuid, ahora_utc
from datetime import datetime, timezone 

class usuarios(Base):
    __tablename__ = "usuarios"

    id = Column(String, primary_key=True, default=generar_uuid, index=True)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=True, default="")
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=ahora_utc)

    # Código temporal para recuperar la contraseña dentro de la aplicación.
    reset_pin = Column(String(6), nullable=True)
    reset_pin_expires = Column(DateTime(timezone=True), nullable=True)

    # Relaciones existentes
    vehiculos_rel = relationship("vehiculos", back_populates="dueno", cascade="all, delete-orphan")
    reservas_rel = relationship("Reservas", back_populates="usuario", cascade="all, delete-orphan")
    metodos_pago_rel = relationship("MetodosPago", back_populates="usuario", cascade="all, delete-orphan")
    cargas_rel = relationship("Cargas", back_populates="usuario", cascade="all, delete-orphan")
    favoritos_rel = relationship("Favoritos", back_populates="usuario", cascade="all, delete-orphan")
    reportes_rel = relationship("Reportes", back_populates="usuario", cascade="all, delete-orphan")
    calificaciones_rel = relationship("Calificaciones", back_populates="usuario", cascade="all, delete-orphan")
