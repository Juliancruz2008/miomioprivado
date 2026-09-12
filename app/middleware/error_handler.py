from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class ErrorHandler(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response

        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Error interno del servidor",
                    "detail": str(e)
                }
            )