from fastapi import FastAPI
from DinnerSwipe_Backend import app as backend_app

# 建立一個外層 app 並將原本的後端掛載在 /api 路徑下
# 這是為了讓 Vercel 的預設 API 路徑（/api/...）能正確傳遞給 FastAPI
app = FastAPI()
app.mount("/api", backend_app)
