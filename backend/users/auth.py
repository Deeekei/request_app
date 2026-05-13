from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend.models.user import UserDB
from backend.schemas.auth_models import ChangePasswordRequest
from dotenv import load_dotenv
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("Set SECRET_KEY in .env file.")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password:str, hashed_password:str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password:str) -> str:
    return pwd_context.hash(password)

def create_access_token(data:dict, expires_delta:timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token:str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Неверный или просроченный токен")


def change_password(db: Session, current_user: UserDB, password_data: ChangePasswordRequest):
    # 1. Проверяем старый пароль
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль"
        )

    # 2. Проверяем, что новый пароль отличается от старого (опционально)
    if password_data.old_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новый пароль должен отличаться от старого"
        )

    # 3. Хэшируем новый пароль и сохраняем
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    db.refresh(current_user)

    return {"message": "Пароль успешно изменен"}