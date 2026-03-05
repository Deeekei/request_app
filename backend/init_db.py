from database import engine, Base
import asyncio

def init_db():
    """Создание таблиц в БД"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    init_db()