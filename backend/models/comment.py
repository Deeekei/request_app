from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base


class CommentDB(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    body = Column(String, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_name = Column(String, nullable=False)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Связи (строковые названия классов)
    user = relationship("UserDB", back_populates="comments")
    request = relationship("RequestDB", back_populates="comments")