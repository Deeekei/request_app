from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum
from datetime import datetime
from backend.models.enum import ObjectsEnum

class UserRole(str, Enum):
    USER = "Пользователь"
    CUSTOMER = "Заказчик"
    PTO = "ПТО"
    DIRECTOR = "Директор"
    EXECUTOR = "Снабжение"
    WATCHER = "наблюдатель"
    ADMIN = "Администратор"

class User(BaseModel):
    id: int
    username: str
    hashed_password: str | None = None
    full_name: str
    role: UserRole
    object: Optional[ObjectsEnum] = None
    created_at: datetime = Field(default_factory=datetime.now)

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=3)
    object: Optional[ObjectsEnum] = None

class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id:int
    username: str
    role: UserRole

class TokenData(BaseModel):
    user_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: UserRole
    full_name: str
    created_at: datetime
    object: Optional[ObjectsEnum] = None

    model_config = ConfigDict(from_attributes=True)