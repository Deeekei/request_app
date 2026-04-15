from sqlalchemy.orm import Session
from typing import Optional
from backend.models import UserDB
from backend.schemas.auth_models import UserCreate
from backend.users.auth import get_password_hash
from backend.models.enum import UserRoleEnum




class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user_data: UserCreate, role: UserRoleEnum = UserRoleEnum.USER) -> UserDB:
        """Создание пользователя"""
        hashed_password = get_password_hash(user_data.password)
        db_user = UserDB(
            username=user_data.username,
            full_name=user_data.full_name,
            role=role,
            hashed_password=hashed_password
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def get_user_by_username(self, username: str) -> Optional[UserDB]:
        """Поиск пользователя по имени"""
        return self.db.query(UserDB).filter(UserDB.username == username).first()

    def get_user_by_id(self, user_id: int) -> Optional[UserDB]:
        """Поиск пользователя по ID"""
        return self.db.query(UserDB).filter(UserDB.id == user_id).first()

    def update_user_role(self, user_id: int, new_role: str) -> Optional[UserDB]:
        """Обновление роли пользователя"""
        user = self.get_user_by_id(user_id)
        if user:
            user.role = new_role
            self.db.commit()
            self.db.refresh(user)
        return user