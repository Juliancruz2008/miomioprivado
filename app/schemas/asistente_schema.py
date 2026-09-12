from pydantic import BaseModel, Field


class AsistenteChatRequest(BaseModel):
    pregunta: str = Field(min_length=1, max_length=1000)
    historial: list[dict[str, str]] = Field(default_factory=list, max_length=12)


class AsistenteChatResponse(BaseModel):
    respuesta: str
    sugerencias: list[str] = Field(default_factory=list)
    respaldo_local: bool = False
