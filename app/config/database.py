# EV_CHARGE/config/database.py

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# ==========================================
# CARGAR VARIABLES .env
# ==========================================
load_dotenv()

# ==========================================
# VARIABLES DE ENTORNO
# ==========================================
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

# Validación estricta
if not all([DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME]):
    raise ValueError("❌ Faltan variables de entorno requeridas en el archivo .env")

# ==========================================
# URL CONEXIÓN POSTGRESQL
# ==========================================
SQLALCHEMY_DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# ==========================================
# ENGINE OPTIMIZADO
# ==========================================
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=10,         # Conexiones base
    max_overflow=20,      # Conexiones adicionales máximas
    pool_pre_ping=True    # Reconecta si la sesión expiró en Postgres
)

# ==========================================
# SESIONES Y BASE ORM
# ==========================================
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# ==========================================
# DEPENDENCIA DB PARA FASTAPI
# ==========================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()