import sys
import os

# 將專案根目錄加到 sys.path 中，這樣才能 import 到上層的 DinnerSwipe_Backend.py
# 現在我們在 frontend/api/index.py，所以要往上一層
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../'))

from fastapi import FastAPI
from DinnerSwipe_Backend import app as backend_app

# 建立一個外層 app 並將原本的後端掛載在 /api 路徑下
# 這是為了讓 Vercel 的預設 API 路徑（/api/...）能正確傳遞給 FastAPI
app = FastAPI()
app.mount("/api", backend_app)
