from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    USER = "пользователь"
    CUSTOMER = "заказчик"
    PTO = "ПТО"
    DIRECTOR = "директор"
    EXECUTOR = "исполнитель"
    WATCHER = "наблюдатель"
    ADMIN = "администратор"

class User(BaseModel):
    id: int
    username: str
    hashed_password: str | None = None
    full_name: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.now)

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=3)

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

    model_config = ConfigDict(from_attributes=True)