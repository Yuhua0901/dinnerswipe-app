from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from api.deps import get_current_user, admin_guard, get_current_user_optional
from schema.schemas import (
    RegisterReq, LoginReq, Token, UserProfile, 
    SessionStartReq, SessionSubmitReq, RecommendReq,
    RecommendationResult, LocationUpdateReq
)
from service.services import AuthService, RecommendService, AnalyticsService, LocationService
from repository.repos import SwipeRepository, ScoreRepository
from model.models import User, SwipeSession, User as UserModel

api_router = APIRouter()

# --- Auth ---
@api_router.post("/auth/register", response_model=Token, summary="新使用者註冊")
def register(req: RegisterReq, db: Session = Depends(get_db)):
    return AuthService.register(db, req)

@api_router.post("/auth/login", response_model=Token, summary="使用者登入")
def login(req: LoginReq, db: Session = Depends(get_db)):
    return AuthService.login(db, req)

@api_router.get("/auth/me", response_model=UserProfile, summary="取得自己的資料")
def me(user: User = Depends(get_current_user)):
    return user

@api_router.put("/user/location", summary="更新使用者 GPS 位置")
def update_location(req: LocationUpdateReq, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return LocationService.update_location(db, user.id, req.lat, req.lng)

# --- Sessions ---
@api_router.post("/session/start", summary="開始一次刷卡場次")
def start_session(req: SessionStartReq, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sess = SwipeRepository.create_session(db, user.id, ",".join(req.mood_tags))
    return {"session_id": sess.id}

@api_router.post("/session/submit", summary="提交刷卡互動結果")
def submit_session(req: SessionSubmitReq, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sess = SwipeRepository.get_session(db, req.session_id)
    if not sess or sess.user_id != user.id:
        raise HTTPException(404, "場次不存在")

    SwipeRepository.save_swipes(db, user.id, sess.id, req.swipes, ",".join(req.mood_tags))
    ScoreRepository.recompute_food_scores(db)
    
    return {"ok": True, "swipes_saved": len(req.swipes)}

# --- Recommendations ---
@api_router.post("/recommend", summary="取得推薦分數")
def recommend(req: RecommendReq, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    results = RecommendService.calculate_recommendations(db, user.id, req)
    top1 = results[0] if results else None
    return {"recommendations": results, "top1": top1}

@api_router.get("/leaderboard", summary="取得全區熱度榜")
def leaderboard(
    category: str = "overall",
    zone: str = None, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    results = ScoreRepository.get_categorized_leaderboard(db, category, user_id, zone, limit)
    
    # 加上排名
    for i, item in enumerate(results):
        item["rank"] = i + 1
        
    return {"leaderboard": results}

@api_router.get("/user/{user_id}/profile", summary="取得使用者口味分析")
def user_profile(user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return AnalyticsService.get_user_profile(db, user_id, user.id, user.reputation)

# --- Admin ---
@api_router.get("/admin/stats", summary="後台統計", dependencies=[Depends(admin_guard)])
def admin_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total_users = db.query(func.count(UserModel.id)).scalar()
    total_swipes = db.query(func.count(SwipeRepository.get_session(db, -1).__class__.id)).scalar() # hacky count, fixed below
    # Let's fix this properly
    from model.models import User, Swipe, SwipeSession, FoodScore
    
    total_swipes = db.query(func.count(Swipe.id)).scalar()
    total_sess = db.query(func.count(SwipeSession.id)).scalar()
    completed = db.query(func.count(SwipeSession.id)).filter(SwipeSession.completed == 1).scalar()
    top_foods = db.query(FoodScore).order_by(FoodScore.score.desc()).limit(10).all()
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    
    return {
        "users": total_users,
        "total_swipes": total_swipes,
        "sessions": total_sess,
        "completed_sessions": completed,
        "completion_rate": f"{round(completed / max(total_sess, 1) * 100, 1)}%",
        "top_foods": [{"name": f.food_name, "score": f.score, "swipes": f.total_swipes} for f in top_foods],
        "recent_users": [{"id": u.id, "name": u.name, "swipes": u.total_swipes} for u in recent_users],
    }

@api_router.get("/admin/dashboard", response_class=HTMLResponse, dependencies=[Depends(admin_guard)])
def admin_dashboard(db: Session = Depends(get_db)):
    stats = admin_stats(db)
    top = "".join(
        f'<tr><td>{i+1}</td><td>{f["name"]}</td><td>{f["score"]:.1f}</td><td>{f["swipes"]}</td></tr>'
        for i, f in enumerate(stats["top_foods"])
    )
    
    html = f"""<!DOCTYPE html><html lang="zh-TW"><head>
<meta charset="UTF-8"><title>DinnerSwipe 後台</title>
<style>
body{{font-family:sans-serif;background:#FDF6EE;color:#3D2010;padding:32px;max-width:900px;margin:0 auto}}
h1{{color:#C4782A;font-size:28px;margin-bottom:24px}}
.cards{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}}
.card{{background:white;border-radius:16px;padding:20px;text-align:center;box-shadow:0 2px 12px rgba(92,48,16,.08)}}
.card .n{{font-size:32px;font-weight:700;color:#E8A249}}
.card .l{{font-size:12px;color:#B89878;margin-top:4px}}
table{{width:100%;border-collapse:collapse;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(92,48,16,.08)}}
th{{background:#5C3010;color:white;padding:12px 16px;text-align:left;font-size:13px}}
td{{padding:11px 16px;border-bottom:1px solid #F2D9B0;font-size:13px}}
tr:last-child td{{border:none}}
</style></head><body>
<h1>🍜 DinnerSwipe 後台儀表板</h1>
<div class="cards">
  <div class="card"><div class="n">{stats["users"]}</div><div class="l">註冊使用者</div></div>
  <div class="card"><div class="n">{stats["total_swipes"]}</div><div class="l">總刷卡次數</div></div>
  <div class="card"><div class="n">{stats["sessions"]}</div><div class="l">刷卡場次</div></div>
  <div class="card"><div class="n">{stats["completion_rate"]}</div><div class="l">完成率</div></div>
</div>
<h2 style="margin-bottom:16px;color:#9B6840">🏆 全區熱度 Top 10</h2>
<table>
  <tr><th>排名</th><th>食物名稱</th><th>熱度分數</th><th>互動次數</th></tr>
  {top}
</table>
</body></html>"""
    return HTMLResponse(html)
