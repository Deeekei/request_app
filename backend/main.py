from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth_router, request_router
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend.repositories.request_repository import RequestRepository
from backend.repositories.user_repository import UserRepository

app = FastAPI(title="Система согласования заявок")




# CORS для локальной разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:63342",  # Ваш текущий порт WebStorm
        "http://127.0.0.1:63342",
        "http://localhost:8000",   # сам бэкенд
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(request_router)

@app.get("/")
async def root():
    return {"message": "API работает"}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
