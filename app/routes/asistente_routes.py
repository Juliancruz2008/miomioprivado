from fastapi import APIRouter, HTTPException, Request

from app.schemas.asistente_schema import AsistenteChatRequest, AsistenteChatResponse
from app.services.asistente_service import responder

router = APIRouter(prefix="/asistente", tags=["Asistente"])


@router.post("/chat", response_model=AsistenteChatResponse)
def chat(data: AsistenteChatRequest, request: Request):
    cliente = request.client.host if request.client else "unknown"
    respuesta, sugerencias, respaldo, error = responder(data.pregunta, data.historial, f"ip:{cliente}")
    if error == "rate_limit":
        raise HTTPException(status_code=429, detail="Has alcanzado el límite temporal de consultas. Intenta nuevamente en un momento.")
    return AsistenteChatResponse(respuesta=respuesta, sugerencias=sugerencias, respaldo_local=respaldo)
