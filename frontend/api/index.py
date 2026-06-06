from fastapi import FastAPI
from fastapi.responses import JSONResponse
import traceback

app = FastAPI()

try:
    import sys
    import os
    # 將 index.py 所在的資料夾加入 sys.path，確保能找到 DinnerSwipe_Backend.py
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from DinnerSwipe_Backend import app as backend_app
    app.mount("/api/v1", backend_app)
except Exception as e:
    error_msg = traceback.format_exc()
    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
    def catch_all(path_name: str):
        return JSONResponse(status_code=500, content={"error": "Backend Import Failed", "traceback": error_msg})
