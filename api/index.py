import sys
import os

# 將專案根目錄加到 sys.path 中，這樣才能 import 到上層的 DinnerSwipe_Backend.py
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# 匯出 app 物件給 Vercel 的 ASGI server 使用
from DinnerSwipe_Backend import app
