#!/usr/bin/env python3
"""
DinnerSwipe Backend Server
==========================
使用 FastAPI + SQLite 實作，不需要額外安裝資料庫。
支援：
  - 使用者註冊 / 登入 (JWT)
  - 刷卡資料上傳（每張卡的互動行為）
  - 跨使用者數據聚合（全體熱度榜）
  - 個人化推薦分數計算（個人60% + 全體25% + 情境15%）
  - 愈多使用者互動，推薦愈準（協同過濾）
  - 後台管理儀表板（/admin/stats）

快速啟動：
  pip install fastapi uvicorn sqlalchemy python-jose passlib[bcrypt] psycopg2-binary python-dotenv
  python DinnerSwipe_Backend.py
  
API 文件：http://localhost:8000/docs
"""

import os, json, math, hashlib, secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from collections import defaultdict
from dotenv import load_dotenv

# 載入 .env 檔案
load_dotenv()

# ── FastAPI & SQLAlchemy ──────────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    DateTime, Text, ForeignKey, Index
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from passlib.context import CryptContext
from jose import jwt, JWTError

# ── Config ────────────────────────────────────────────────────────────────────
# 優先讀取環境變數中的 DATABASE_URL，若無則使用本機 SQLite
DB_URL       = os.getenv("DATABASE_URL", "sqlite:///./dinnerswipe.db")

# SQLAlchemy 1.4+ 要求 postgresql:// 而不是 postgres://
if DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

SECRET_KEY   = os.getenv("DS_SECRET", secrets.token_hex(32))
ALGORITHM    = "HS256"
TOKEN_EXPIRE = 30  # days
ADMIN_TOKEN  = os.getenv("DS_ADMIN", "dinnerswipe-admin-2024")

# 針對不同資料庫種類進行 engine 初始化
if DB_URL.startswith("sqlite"):
    engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DB_URL)

Session_ = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base    = declarative_base()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
app     = FastAPI(title="DinnerSwipe API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 正式部署改成你的前端 domain
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ORM Models ────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(64), nullable=False)
    email       = Column(String(128), unique=True, index=True, nullable=False)
    pw_hash     = Column(String(256), nullable=False)
    region      = Column(String(64), default="台南市東區")
    created_at  = Column(DateTime, default=datetime.utcnow)
    total_swipes= Column(Integer, default=0)
    reputation  = Column(Integer, default=0)   # 金舌頭聲望
    swipes      = relationship("Swipe", back_populates="user")
    sessions    = relationship("SwipeSession", back_populates="user")


class SwipeSession(Base):
    """一次 15 張的刷卡場次"""
    __tablename__ = "swipe_sessions"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    mood_tags   = Column(String(256), default="")   # e.g. "一個人,疲憊求療癒"
    started_at  = Column(DateTime, default=datetime.utcnow)
    completed   = Column(Integer, default=0)        # 0/1
    user        = relationship("User", back_populates="sessions")
    swipes      = relationship("Swipe", back_populates="session")


class Swipe(Base):
    """每一張卡的互動記錄"""
    __tablename__ = "swipes"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id   = Column(Integer, ForeignKey("swipe_sessions.id"), nullable=False)
    food_name    = Column(String(128), nullable=False)
    food_zone    = Column(String(64), default="")
    action       = Column(String(16), nullable=False)   # left / right / heart
    emotion_tag  = Column(String(32), default="")       # 渴望/療癒/懷念...
    mood_context = Column(String(128), default="")      # session mood snapshot
    swiped_at    = Column(DateTime, default=datetime.utcnow)
    user         = relationship("User", back_populates="swipes")
    session      = relationship("SwipeSession", back_populates="swipes")

Index("ix_swipes_food", Swipe.food_name)
Index("ix_swipes_user_food", Swipe.user_id, Swipe.food_name)


class FoodScore(Base):
    """
    預計算的全體熱度分數（每次有新資料進來時更新）
    這是推薦演算法「群眾熱度25%」的資料來源
    """
    __tablename__ = "food_scores"
    id           = Column(Integer, primary_key=True)
    food_name    = Column(String(128), unique=True, index=True)
    food_zone    = Column(String(64), default="")
    total_right  = Column(Integer, default=0)   # right + heart count
    total_heart  = Column(Integer, default=0)
    total_left   = Column(Integer, default=0)
    total_swipes = Column(Integer, default=0)
    score        = Column(Float, default=0.0)   # 0-100, computed
    updated_at   = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(engine)

# ── Helpers ───────────────────────────────────────────────────────────────────
def get_db():
    db = Session_()
    try:
        yield db
    finally:
        db.close()

def hash_pw(pw: str) -> str:
    return pwd_ctx.hash(pw)

def verify_pw(pw: str, hashed: str) -> bool:
    return pwd_ctx.verify(pw, hashed)

def make_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, ALGORITHM)

def current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "請先登入")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = int(payload["sub"])
    except (JWTError, ValueError):
        raise HTTPException(401, "Token 無效或已過期")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(401, "使用者不存在")
    return user

def admin_guard(x_admin_token: str = Header(None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(403, "需要管理員 Token")

# ── Recommendation Engine ─────────────────────────────────────────────────────

def recompute_food_scores(db: Session):
    """
    重新計算全體熱度分數。
    公式：score = (heart×2 + right) / max(total_swipes, 1) × 100
    資料越多越準確。
    """
    from sqlalchemy import func
    rows = (
        db.query(
            Swipe.food_name,
            func.max(Swipe.food_zone).label("food_zone"),
            func.count().label("total"),
            func.sum((Swipe.action == "heart").cast(Integer)).label("hearts"),
            func.sum((Swipe.action == "right").cast(Integer)).label("rights"),
            func.sum((Swipe.action == "left").cast(Integer)).label("lefts"),
        )
        .group_by(Swipe.food_name)
        .all()
    )
    for r in rows:
        total  = r.total or 1
        hearts = r.hearts or 0
        rights = r.rights or 0
        lefts  = r.lefts  or 0
        score  = ((hearts * 2 + rights) / total) * 100
        fs = db.query(FoodScore).filter_by(food_name=r.food_name).first()
        if not fs:
            fs = FoodScore(food_name=r.food_name, food_zone=r.food_zone or "")
            db.add(fs)
        fs.total_swipes = total
        fs.total_heart  = hearts
        fs.total_right  = rights
        fs.total_left   = lefts
        fs.score        = round(score, 2)
        fs.updated_at   = datetime.utcnow()
    db.commit()


def personal_score(food_name: str, user_id: int, db: Session) -> float:
    """
    個人化分數（60% 權重）：
    - heart = 100, right = 70, left = 0, 未評 = 50（中性基線）
    - 有多次記錄則取加權平均（越近越重要）
    """
    rows = (
        db.query(Swipe)
        .filter(Swipe.user_id == user_id, Swipe.food_name == food_name)
        .order_by(Swipe.swiped_at.desc())
        .limit(10)
        .all()
    )
    if not rows:
        return 50.0   # 中性基線
    score_map = {"heart": 100, "right": 70, "left": 0}
    total_w, total_s = 0.0, 0.0
    for i, row in enumerate(rows):
        w = 1.0 / (i + 1)   # 最近的權重最高
        total_w += w
        total_s += score_map.get(row.action, 50) * w
    return round(total_s / total_w, 2)


def community_score(food_name: str, db: Session) -> float:
    """全體熱度分數（25% 權重）"""
    fs = db.query(FoodScore).filter_by(food_name=food_name).first()
    return fs.score if fs else 0.0


def context_score(food_name: str, mood_tags: List[str], emotion_map: Dict[str,str], db: Session) -> float:
    """
    情境分數（15% 權重）：
    看過去有相同情緒標籤時，這個食物被愛心/右滑的比率
    """
    if not mood_tags and not emotion_map:
        return 50.0
    rows = (
        db.query(Swipe)
        .filter(
            Swipe.food_name == food_name,
            Swipe.action.in_(["right", "heart"])
        )
        .all()
    )
    if not rows:
        return 50.0
    matched = sum(
        1 for r in rows
        if any(tag in r.mood_context for tag in mood_tags)
        or r.emotion_tag in emotion_map.values()
    )
    return round((matched / len(rows)) * 100, 2)


def final_recommendation_score(
    food_name: str,
    user_id: int,
    mood_tags: List[str],
    emotion_map: Dict[str, str],
    db: Session
) -> float:
    """
    最終推薦分數 = 個人意願(60%) + 群眾熱度(25%) + 情境標籤(15%)
    隨著資料累積，每個分項都會越來越準。
    """
    ps = personal_score(food_name, user_id, db)
    cs = community_score(food_name, db)
    ctx = context_score(food_name, mood_tags, emotion_map, db)
    return round(ps * 0.60 + cs * 0.25 + ctx * 0.15, 2)


# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class RegisterReq(BaseModel):
    name: str
    email: str
    password: str
    region: Optional[str] = "台南市東區"

class LoginReq(BaseModel):
    email: str
    password: str

class SwipeItem(BaseModel):
    food_name: str
    food_zone: str = ""
    action: str             # left / right / heart
    emotion_tag: str = ""

class SessionStartReq(BaseModel):
    mood_tags: List[str] = []

class SessionSubmitReq(BaseModel):
    session_id: int
    swipes: List[SwipeItem]
    mood_tags: List[str] = []

class RecommendReq(BaseModel):
    food_names: List[str]
    mood_tags: List[str] = []
    emotion_map: Dict[str, str] = {}

# ── Auth Endpoints ────────────────────────────────────────────────────────────
@app.post("/auth/register", summary="新使用者註冊")
def register(req: RegisterReq, db: Session = Depends(get_db)):
    if db.query(User).filter_by(email=req.email).first():
        raise HTTPException(400, "此電子信箱已被使用")
    user = User(
        name    = req.name,
        email   = req.email,
        pw_hash = hash_pw(req.password),
        region  = req.region or "台南市東區",
    )
    db.add(user); db.commit(); db.refresh(user)
    return {"token": make_token(user.id), "user_id": user.id, "name": user.name}


@app.post("/auth/login", summary="使用者登入")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=req.email).first()
    if not user or not verify_pw(req.password, user.pw_hash):
        raise HTTPException(401, "帳號或密碼錯誤")
    return {"token": make_token(user.id), "user_id": user.id, "name": user.name}


@app.get("/auth/me", summary="取得自己的資料")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {
        "id": user.id, "name": user.name, "email": user.email,
        "region": user.region, "total_swipes": user.total_swipes,
        "reputation": user.reputation, "created_at": user.created_at,
    }

# ── Swipe Session Endpoints ───────────────────────────────────────────────────
@app.post("/session/start", summary="開始一次 15 張刷卡場次")
def start_session(
    req: SessionStartReq,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    sess = SwipeSession(
        user_id   = user.id,
        mood_tags = ",".join(req.mood_tags),
    )
    db.add(sess); db.commit(); db.refresh(sess)
    return {"session_id": sess.id}


@app.post("/session/submit", summary="提交整場 15 張互動結果")
def submit_session(
    req: SessionSubmitReq,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    sess = db.get(SwipeSession, req.session_id)
    if not sess or sess.user_id != user.id:
        raise HTTPException(404, "場次不存在")

    mood_ctx = ",".join(req.mood_tags)
    for item in req.swipes:
        sw = Swipe(
            user_id      = user.id,
            session_id   = sess.id,
            food_name    = item.food_name,
            food_zone    = item.food_zone,
            action       = item.action,
            emotion_tag  = item.emotion_tag,
            mood_context = mood_ctx,
        )
        db.add(sw)

    sess.completed   = 1
    user.total_swipes += len(req.swipes)
    db.commit()

    # 重新計算全體熱度分數（背景可改為 async task）
    recompute_food_scores(db)

    return {"ok": True, "swipes_saved": len(req.swipes)}


@app.post("/recommend", summary="取得個人化推薦分數（越多資料越準）")
def recommend(
    req: RecommendReq,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    傳入本場次刷過的食物清單，
    回傳每道食物的最終推薦分數與分項說明。
    """
    results = []
    for name in req.food_names:
        ps  = personal_score(name, user.id, db)
        cs  = community_score(name, db)
        ctx = context_score(name, req.mood_tags, req.emotion_map, db)
        final = round(ps*0.60 + cs*0.25 + ctx*0.15, 2)
        results.append({
            "food_name"        : name,
            "final_score"      : final,
            "personal_score"   : ps,
            "community_score"  : cs,
            "context_score"    : ctx,
            "weights"          : {"personal": 0.60, "community": 0.25, "context": 0.15},
        })
    results.sort(key=lambda x: x["final_score"], reverse=True)
    return {"recommendations": results, "top1": results[0] if results else None}


@app.get("/leaderboard", summary="取得全區食物熱度榜（Top 50）")
def leaderboard(
    zone: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    q = db.query(FoodScore).order_by(FoodScore.score.desc())
    if zone:
        q = q.filter(FoodScore.food_zone == zone)
    rows = q.limit(min(limit, 200)).all()
    return {"leaderboard": [
        {
            "rank"        : i+1,
            "food_name"   : r.food_name,
            "food_zone"   : r.food_zone,
            "score"       : r.score,
            "total_right" : r.total_right + r.total_heart,
            "total_left"  : r.total_left,
            "heart_rate"  : round(r.total_heart / max(r.total_swipes,1) * 100, 1),
        }
        for i, r in enumerate(rows)
    ]}


@app.get("/user/{user_id}/profile", summary="取得某使用者的口味分析")
def user_profile(
    user_id: int,
    me: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    if me.id != user_id:
        raise HTTPException(403, "只能查看自己的資料")
    swipes = db.query(Swipe).filter_by(user_id=user_id).all()
    zone_likes: Dict[str, int] = defaultdict(int)
    zone_hearts: Dict[str, int] = defaultdict(int)
    top_foods: Dict[str, int] = defaultdict(int)
    for sw in swipes:
        if sw.action in ("right","heart"):
            zone_likes[sw.food_zone or "未分類"] += 1
            top_foods[sw.food_name] += 1
        if sw.action == "heart":
            zone_hearts[sw.food_zone or "未分類"] += 1
    return {
        "total_swipes"   : len(swipes),
        "zone_preference": dict(sorted(zone_likes.items(), key=lambda x: -x[1])),
        "zone_hearts"    : dict(sorted(zone_hearts.items(), key=lambda x: -x[1])),
        "top_foods"      : dict(sorted(top_foods.items(), key=lambda x: -x[1])[:20]),
        "reputation"     : me.reputation,
    }

# ── Admin Endpoints ───────────────────────────────────────────────────────────
@app.get("/admin/stats", summary="後台統計儀表板", dependencies=[Depends(admin_guard)])
def admin_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total_users  = db.query(func.count(User.id)).scalar()
    total_swipes = db.query(func.count(Swipe.id)).scalar()
    total_sess   = db.query(func.count(SwipeSession.id)).scalar()
    completed    = db.query(func.count(SwipeSession.id)).filter_by(completed=1).scalar()
    top_foods    = (
        db.query(FoodScore)
        .order_by(FoodScore.score.desc())
        .limit(10).all()
    )
    recent_users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .limit(5).all()
    )
    return {
        "users"           : total_users,
        "total_swipes"    : total_swipes,
        "sessions"        : total_sess,
        "completed_sessions": completed,
        "completion_rate" : f"{round(completed/max(total_sess,1)*100,1)}%",
        "top_foods"       : [{"name": f.food_name, "score": f.score, "swipes": f.total_swipes} for f in top_foods],
        "recent_users"    : [{"id": u.id, "name": u.name, "swipes": u.total_swipes} for u in recent_users],
    }


@app.get("/admin/dashboard", summary="HTML 儀表板", dependencies=[Depends(admin_guard)])
def admin_dashboard(db: Session = Depends(get_db)):
    stats = admin_stats(db)
    top = "".join(
        f'<tr><td>{i+1}</td><td>{f["name"]}</td>'
        f'<td>{f["score"]:.1f}</td><td>{f["swipes"]}</td></tr>'
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
<p style="margin-top:24px;font-size:12px;color:#B89878">
  資料更新：每次使用者完成 15 張場次後自動重新計算<br>
  使用 Header <code>x-admin-token: {ADMIN_TOKEN}</code> 存取此頁面
</p>
</body></html>"""
    return HTMLResponse(html)


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("=" * 55)
    print("  DinnerSwipe Backend 啟動中...")
    print("  API 文件：  http://localhost:8000/docs")
    print("  後台儀表板：http://localhost:8000/admin/dashboard")
    print(f"  Admin Token: {ADMIN_TOKEN}")
    print("=" * 55)
    uvicorn.run("DinnerSwipe_Backend:app", host="0.0.0.0", port=8000, reload=True)
