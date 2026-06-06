from sqlalchemy.orm import Session
from fastapi import HTTPException
from core.security import verify_password, get_password_hash, create_access_token
from repository.repos import UserRepository, SwipeRepository, ScoreRepository
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
        results = []
        for name in req.food_names:
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
