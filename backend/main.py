import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from database import engine, Base
from api.endpoints import api_router

# 建立所有資料表 (若使用 Supabase 建議改為 alembic 管理，這裡保留最簡化做法)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # 允許前端跨域
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    print("=" * 55)
    print(f"  {settings.PROJECT_NAME} 啟動中...")
    print(f"  API 文件：http://localhost:8000/docs")
    print(f"  後台：http://localhost:8000{settings.API_V1_STR}/admin/dashboard")
    print("=" * 55)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
