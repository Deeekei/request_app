from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.repositories.user_repository import UserRepository
from backend.schemas.auth_models import UserCreate, UserRole, Token, UserResponse
from backend.models import UserDB, UserRoleEnum
from backend.database import get_db
from backend.users.auth import (
    verify_password, get_password_hash,
    create_access_token, decode_token
)

router = APIRouter(prefix="/auth", tags=["Аутентификация"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# === Dependency ===
async def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
) -> UserDB:  # Возвращаем SQLAlchemy модель
    """Получает текущего пользователя из токена"""
    payload = decode_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен"
        )

    try:
        user = db.query(UserDB).filter(UserDB.id == int(user_id)).first()  # ← Поиск по ID!
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный формат токена"
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден"
        )

    return user


# === Endpoints ===
@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
        user_data: UserCreate,
        db: Session = Depends(get_db)
):
    # Проверка существования
    repo = UserRepository(db)
    existing = repo.get_user_by_username(user_data.username)
    if existing:
        raise HTTPException(400, "Пользователь уже существует")

    # Создание пользователя
    try:
        db_user = repo.create_user(
            user_data=user_data,
            role=UserRoleEnum.USER
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании пользователя: {str(e)}"
        )

    return UserResponse.model_validate(db_user)


@router.post("/login", response_model=Token)
async def login(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: Session = Depends(get_db)
):
    repo = UserRepository(db)
    user = repo.get_user_by_username(form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        role=UserRole(user.role.value)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
        current_user: UserDB = Depends(get_current_user)
):
    """Получить информацию о текущем пользователе"""
    return UserResponse.model_validate(current_user)


# === Role Checkers ===
async def require_customer(
        current_user: UserDB = Depends(get_current_user)
):
    if current_user.role not in [UserRoleEnum.CUSTOMER, UserRoleEnum.ADMIN]:
        raise HTTPException(403, "Требуется роль заказчика")
    return current_user


async def require_pto(
        current_user: UserDB = Depends(get_current_user)
):
    if current_user.role not in [UserRoleEnum.PTO, UserRoleEnum.ADMIN]:
        raise HTTPException(403, "Требуется роль ПТО")
    return current_user


async def require_director(
        current_user: UserDB = Depends(get_current_user)
):
    if current_user.role not in [UserRoleEnum.DIRECTOR, UserRoleEnum.ADMIN]:
        raise HTTPException(403, "Требуется роль директора")
    return current_user


async def require_admin(
        current_user: UserDB = Depends(get_current_user)
):
    if current_user.role != UserRoleEnum.ADMIN:
        raise HTTPException(403, "Требуется роль администратора")
    return current_user

async def require_executor(
        current_user: UserDB = Depends(get_current_user)
):
    if current_user.role not in [UserRoleEnum.EXECUTOR, UserRoleEnum.ADMIN]:
        raise HTTPException(403, detail="Требуется роль снабжение")
    return current_user