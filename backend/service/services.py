from sqlalchemy.orm import Session
from fastapi import HTTPException
from core.security import verify_password, get_password_hash, create_access_token
from repository.repos import UserRepository, SwipeRepository, ScoreRepository, UsageRepository
from schema.schemas import RegisterReq, LoginReq, RecommendReq, RecommendationResult
from typing import List, Dict
import urllib.request
import json

class AuthService:
    @staticmethod
    def register(db: Session, req: RegisterReq):
        if UserRepository.get_by_email(db, req.email):
            raise HTTPException(400, "此聯絡方式（手機/信箱）已被使用")
        if UserRepository.get_by_name(db, req.name):
            raise HTTPException(400, "此使用者名稱已被使用")
        
        user = UserRepository.create(db, req, get_password_hash(req.password))
        return {
            "token": create_access_token(user.id),
            "user_id": user.id,
            "name": user.name
        }

    @staticmethod
    def login(db: Session, req: LoginReq):
        user = UserRepository.get_by_name(db, req.name)
        if not user or not verify_password(req.password, user.pw_hash):
            raise HTTPException(401, "使用者名稱或密碼錯誤")
        
        return {
            "token": create_access_token(user.id),
            "user_id": user.id,
            "name": user.name
        }

class RecommendService:
    @staticmethod
    def personal_score(db: Session, food_name: str, user_id: int) -> float:
        rows = SwipeRepository.get_user_food_swipes(db, user_id, food_name)
        if not rows:
            return 50.0
        
        score_map = {"heart": 100, "right": 70, "left": 0}
        total_w, total_s = 0.0, 0.0
        for i, row in enumerate(rows):
            w = 1.0 / (i + 1)
            total_w += w
            total_s += score_map.get(row.action, 50) * w
            
        return round(total_s / total_w, 2)

    @staticmethod
    def context_score(db: Session, food_name: str, mood_tags: List[str], emotion_map: Dict[str, str]) -> float:
        if not mood_tags and not emotion_map:
            return 50.0
            
        rows = SwipeRepository.get_food_positive_swipes(db, food_name)
        if not rows:
            return 50.0
            
        matched = sum(
            1 for r in rows
            if any(tag in r.mood_context for tag in mood_tags)
            or r.emotion_tag in emotion_map.values()
        )
        return round((matched / len(rows)) * 100, 2)

    @staticmethod
    def calculate_recommendations(db: Session, user_id: int, req: RecommendReq) -> List[RecommendationResult]:
        from model.models import SwipeSession, Swipe
        
        results = []
        food_names = req.food_names
        
        # 若傳入空名單或預設 mock 資料，則進行動態候選食物提取
        if not food_names or food_names == ['老字號雞湯麵', '炙燒鮭魚握壽司', '經典美式起司漢堡']:
            # 1. 優先獲取最新場次（Session）中，使用者右滑或愛心過的食物
            latest_sess = db.query(SwipeSession).filter(
                SwipeSession.user_id == user_id
            ).order_by(SwipeSession.started_at.desc()).first()
            
            if latest_sess:
                db_swipes = db.query(Swipe.food_name).filter(
                    Swipe.user_id == user_id,
                    Swipe.session_id == latest_sess.id,
                    Swipe.action.in_(["right", "heart"])
                ).distinct().all()
                food_names = [s[0] for s in db_swipes] if db_swipes else []
                
            # 2. 若最新場次無喜好食物，則擴展至歷史所有正面互動過（右滑或愛心）的食物
            if not food_names:
                db_swipes = db.query(Swipe.food_name).filter(
                    Swipe.user_id == user_id,
                    Swipe.action.in_(["right", "heart"])
                ).distinct().all()
                food_names = [s[0] for s in db_swipes] if db_swipes else []

        for name in food_names:
            ps = RecommendService.personal_score(db, name, user_id)
            cs = ScoreRepository.get_community_score(db, name)
            ctx = RecommendService.context_score(db, name, req.mood_tags, req.emotion_map)
            
            final = round(ps * 0.60 + cs * 0.25 + ctx * 0.15, 2)
            results.append(RecommendationResult(
                food_name=name,
                final_score=final,
                personal_score=ps,
                community_score=cs,
                context_score=ctx,
                weights={"personal": 0.60, "community": 0.25, "context": 0.15}
            ))
            
        results.sort(key=lambda x: x.final_score, reverse=True)
        return results

class AnalyticsService:
    @staticmethod
    def get_user_profile(db: Session, user_id: int, current_user_id: int, reputation: int):
        if user_id != current_user_id:
            raise HTTPException(403, "只能查看自己的資料")
            
        swipes = SwipeRepository.get_user_swipes(db, user_id)
        from collections import defaultdict
        
        zone_likes = defaultdict(int)
        zone_hearts = defaultdict(int)
        top_foods = defaultdict(int)
        
        for sw in swipes:
            if sw.action in ("right", "heart"):
                zone_likes[sw.food_zone or "未分類"] += 1
                top_foods[sw.food_name] += 1
            if sw.action == "heart":
                zone_hearts[sw.food_zone or "未分類"] += 1
                
        return {
            "total_swipes": len(swipes),
            "zone_preference": dict(sorted(zone_likes.items(), key=lambda x: -x[1])),
            "zone_hearts": dict(sorted(zone_hearts.items(), key=lambda x: -x[1])),
            "top_foods": dict(sorted(top_foods.items(), key=lambda x: -x[1])[:20]),
            "reputation": reputation,
        }

class LocationService:
    @staticmethod
    def update_location(db: Session, user_id: int, lat: float, lng: float):
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=14&addressdetails=1"
        req = urllib.request.Request(url, headers={"User-Agent": "DinnerSwipe-App/1.0"})
        region = "未知區域"
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    address = data.get("address", {})
                    city = address.get("city") or address.get("county") or ""
                    suburb = address.get("suburb") or address.get("town") or address.get("village") or ""
                    
                    new_region = f"{city}{suburb}".strip()
                    if new_region:
                        region = new_region
        except Exception as e:
            print("Location Update Error:", e)
            
        user = UserRepository.get_by_id(db, user_id)
        if user:
            if region != "未知區域":
                user.region = region
            db.commit()
            return {"ok": True, "region": user.region}
        return {"ok": False, "msg": "User not found"}


class UsageService:
    """使用時間追蹤的業務邏輯層"""

    @staticmethod
    def start_tracking(db: Session, user_id: int, page_context: str = "") -> dict:
        """
        開始追蹤使用時間
        會自動關閉該用戶先前未結束的 Session
        """
        usage_sess = UsageRepository.create_session(db, user_id, page_context)
        return {"session_id": usage_sess.id, "started_at": str(usage_sess.started_at)}

    @staticmethod
    def heartbeat(db: Session, session_id: int, user_id: int) -> dict:
        """
        處理心跳回報
        """
        usage_sess = UsageRepository.heartbeat(db, session_id, user_id)
        if not usage_sess:
            raise HTTPException(404, "使用 Session 不存在或已結束")
        return {"ok": True, "session_id": session_id}

    @staticmethod
    def end_tracking(db: Session, session_id: int, user_id: int) -> dict:
        """
        結束使用時間追蹤
        """
        return UsageRepository.end_session(db, session_id, user_id)

    @staticmethod
    def get_stats(db: Session, user_id: int) -> dict:
        """
        取得用戶的使用時間統計
        """
        return UsageRepository.get_user_usage_stats(db, user_id)
