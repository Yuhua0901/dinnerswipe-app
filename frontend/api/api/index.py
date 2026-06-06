import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from DinnerSwipe_Backend import app as backend_app

app = FastAPI()
app.mount("/api", backend_app)
