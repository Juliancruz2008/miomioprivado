from pydantic import BaseModel, EmailStr

class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class VerifyPinSchema(BaseModel):
    email: EmailStr
    pin: str

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str
