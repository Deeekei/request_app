from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
from backend.models.enum import UserRoleEnum, ObjectsEnum


class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(Enum(UserRoleEnum), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи (строковые названия классов, чтобы избежать циклических импортов)
    requests_created = relationship("RequestDB", back_populates="author")
    comments = relationship("CommentDB", back_populates="user")
    objects = relationship(
        "ObjectsDB",
        back_populates="customer",
        cascade="all, delete-orphan",
    )