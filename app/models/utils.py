# Backend/models/utils.py
import uuid
from datetime import datetime, timezone


def generar_uuid():
    return str(uuid.uuid4())


def ahora_utc():
    return datetime.now(timezone.utc)