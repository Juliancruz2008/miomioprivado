# Backend/utils/response.py
from fastapi import HTTPException

def error_response(message: str, error_details: str, status_code: int = 404):
    raise HTTPException(
        status_code=status_code,
        detail={
            "status": "error",
            "message": message,
            "details": error_details
        }
    )

def success_response(message: str, data: any, status_code: int = 200):
    return {
        "status": "success",
        "message": message,
        "data": data
    }