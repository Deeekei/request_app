from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# URL базы данных из .env или значение по умолчанию
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123@localhost/construction_db")

# Создаем engine
engine = create_engine(
    DATABASE_URL,
    pool_size=5,  # количество соединений в пуле
    max_overflow=10,  # максимум дополнительных соединений
    echo=False,
    pool_pre_ping=True
)

# Базовый класс для моделей
Base = declarative_base()

# Фабрика сессий
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Зависимость для FastAPI
def get_db():
    """Создает и закрывает сессию базы данных для каждого запроса"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
