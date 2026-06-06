from fastapi import FastAPI
from DinnerSwipe_Backend import app as backend_app

# 建立一個外層 app 並將原本的後端掛載在 /api/v1 路徑下
# 這是為了讓前端發送的 /api/v1/... 請求能正確對應到後端的 /...
app = FastAPI()
app.mount("/api/v1", backend_app)
