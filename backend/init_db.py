from backend.database import engine, Base
import asyncio
from backend.models.agreement import Agreement, AgreementMaterial
from backend.models.request import RequestDB, RequestMaterial
from backend.models.user import UserDB


def init_db():
    """Создание таблиц в БД"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    init_db()