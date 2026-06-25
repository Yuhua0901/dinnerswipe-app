from sqlalchemy.orm import Session
from sqlalchemy import func, Integer
from model.models import User, SwipeSession, Swipe, FoodScore, UsageSession
from schema.schemas import RegisterReq, SwipeItem
from datetime import datetime, timedelta

class UserRepository:
    @staticmethod
    def get_by_email(db: Session, email: str) -> User:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_by_name(db: Session, name: str) -> User:
        return db.query(User).filter(User.name == name).first()

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> User:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def create(db: Session, user_in: RegisterReq, pw_hash: str) -> User:
        user = User(
            name=user_in.name,
            email=user_in.email,
            pw_hash=pw_hash,
            region=user_in.region or "台南市東區"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

class SwipeRepository:
    @staticmethod
    def create_session(db: Session, user_id: int, mood_tags: str) -> SwipeSession:
        sess = SwipeSession(user_id=user_id, mood_tags=mood_tags)
        db.add(sess)
        db.commit()
        db.refresh(sess)
        return sess

    @staticmethod
    def get_session(db: Session, session_id: int) -> SwipeSession:
        return db.query(SwipeSession).filter(SwipeSession.id == session_id).first()

    @staticmethod
    def save_swipes(db: Session, user_id: int, session_id: int, swipes: list[SwipeItem], mood_ctx: str):
        for item in swipes:
            sw = Swipe(
                user_id=user_id,
                session_id=session_id,
                food_name=item.food_name,
                food_zone=item.food_zone,
                action=item.action,
                emotion_tag=item.emotion_tag,
                mood_context=mood_ctx
            )
            db.add(sw)
        
        sess = SwipeRepository.get_session(db, session_id)
        if sess:
            sess.completed = 1
        
        user = UserRepository.get_by_id(db, user_id)
        if user:
            user.total_swipes += len(swipes)
            
        db.commit()

    @staticmethod
    def get_user_swipes(db: Session, user_id: int):
        return db.query(Swipe).filter(Swipe.user_id == user_id).all()

    @staticmethod
    def get_user_food_swipes(db: Session, user_id: int, food_name: str, limit: int = 10):
        return db.query(Swipe).filter(
            Swipe.user_id == user_id, 
            Swipe.food_name == food_name
        ).order_by(Swipe.swiped_at.desc()).limit(limit).all()

    @staticmethod
    def get_food_positive_swipes(db: Session, food_name: str):
        return db.query(Swipe).filter(
            Swipe.food_name == food_name,
            Swipe.action.in_(["right", "heart"])
        ).all()

class ScoreRepository:
    @staticmethod
    def recompute_food_scores(db: Session):
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
            total = r.total or 1
            hearts = r.hearts or 0
            rights = r.rights or 0
            lefts = r.lefts or 0
            score = ((hearts * 2 + rights) / total) * 100
            
            fs = db.query(FoodScore).filter(FoodScore.food_name == r.food_name).first()
            if not fs:
                fs = FoodScore(food_name=r.food_name, food_zone=r.food_zone or "")
                db.add(fs)
                
            fs.total_swipes = total
            fs.total_heart = hearts
            fs.total_right = rights
            fs.total_left = lefts
            fs.score = round(score, 2)
            
        db.commit()

    @staticmethod
    def get_community_score(db: Session, food_name: str) -> float:
        fs = db.query(FoodScore).filter(FoodScore.food_name == food_name).first()
        return fs.score if fs else 0.0

    @staticmethod
    def get_leaderboard(db: Session, zone: str = None, limit: int = 50):
        q = db.query(FoodScore).order_by(FoodScore.score.desc())
        if zone:
            q = q.filter(FoodScore.food_zone == zone)
        return q.limit(limit).all()

    @staticmethod
    def get_categorized_leaderboard(db: Session, category: str, user_id: int = None, zone: str = None, limit: int = 50):
        from sqlalchemy import or_, desc, Integer
        
        # 1. 綜合排名
        if category == "overall":
            rows = ScoreRepository.get_leaderboard(db, zone, limit)
            return [
                {
                    "food_name": r.food_name,
                    "food_zone": r.food_zone,
                    "score": r.score,
                    "total_right": r.total_heart + r.total_right,
                    "total_left": r.total_left,
                    "heart_rate": round(r.total_heart / max(r.total_swipes, 1) * 100, 1)
                } for r in rows
            ]
            
        # 2. 個人喜好排行
        if category == "personal":
            if not user_id:
                return []
            rows = (
                db.query(
                    Swipe.food_name,
                    func.max(Swipe.food_zone).label("food_zone"),
                    func.count(Swipe.id).label("total_swipes"),
                    func.sum((Swipe.action == "heart").cast(Integer)).label("total_heart"),
                    func.sum((Swipe.action == "right").cast(Integer)).label("total_right"),
                    func.sum((Swipe.action == "left").cast(Integer)).label("total_left")
                )
                .filter(Swipe.user_id == user_id)
            )
            if zone:
                rows = rows.filter(Swipe.food_zone == zone)
                
            rows = rows.group_by(Swipe.food_name).all()
            
            result = []
            for r in rows:
                total = r.total_swipes or 1
                hearts = r.total_heart or 0
                rights = r.total_right or 0
                lefts = r.total_left or 0
                if hearts + rights == 0:
                    continue
                score = round(((hearts * 2 + rights) / total) * 100, 2)
                result.append({
                    "food_name": r.food_name,
                    "food_zone": r.food_zone or "",
                    "score": score,
                    "total_right": hearts + rights,
                    "total_left": lefts,
                    "heart_rate": round(hearts / total * 100, 1) if total > 0 else 0.0
                })
            result.sort(key=lambda x: x["score"], reverse=True)
            return result[:limit]

        # 3. 情感/情境分類排行
        q = db.query(
            Swipe.food_name,
            func.max(Swipe.food_zone).label("food_zone"),
            func.count(Swipe.id).label("total_swipes"),
            func.sum((Swipe.action == "heart").cast(Integer)).label("total_heart"),
            func.sum((Swipe.action == "right").cast(Integer)).label("total_right"),
            func.sum((Swipe.action == "left").cast(Integer)).label("total_left")
        )
        
        if category == "heal":
            q = q.filter(or_(Swipe.mood_context.like("%疲憊求療癒%"), Swipe.emotion_tag == "療癒"))
        elif category == "solo":
            q = q.filter(Swipe.mood_context.like("%一個人%"))
        elif category == "group":
            q = q.filter(or_(Swipe.mood_context.like("%想找人揪%"), Swipe.emotion_tag == "揪人"))
        elif category == "healthy":
            q = q.filter(Swipe.mood_context.like("%健康優先%"))
        else:
            return []
            
        if zone:
            q = q.filter(Swipe.food_zone == zone)
            
        rows = q.group_by(Swipe.food_name).all()
        
        result = []
        for r in rows:
            total = r.total_swipes or 1
            hearts = r.total_heart or 0
            rights = r.total_right or 0
            lefts = r.total_left or 0
            score = round(((hearts * 2 + rights) / total) * 100, 2)
            result.append({
                "food_name": r.food_name,
                "food_zone": r.food_zone or "",
                "score": score,
                "total_right": hearts + rights,
                "total_left": lefts,
                "heart_rate": round(hearts / total * 100, 1) if total > 0 else 0.0
            })
            
        result.sort(key=lambda x: x["score"], reverse=True)
        return result[:limit]


class UsageRepository:
    """使用時間追蹤的資料存取層"""

    # NOTE: 心跳超時閾值，超過此時間未收到心跳則視為已離線
    HEARTBEAT_TIMEOUT_SECONDS = 90

    @staticmethod
    def create_session(db: Session, user_id: int, page_context: str = "") -> UsageSession:
        """
        建立新的使用時間 Session
        同時關閉該用戶所有未結束的舊 Session（防止殘留）
        """
        UsageRepository._close_stale_sessions(db, user_id)

        usage_sess = UsageSession(
            user_id=user_id,
            page_context=page_context
        )
        db.add(usage_sess)

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.last_active_at = func.now()

        db.commit()
        db.refresh(usage_sess)
        return usage_sess

    @staticmethod
    def heartbeat(db: Session, session_id: int, user_id: int) -> UsageSession | None:
        """
        更新心跳時間，確認用戶仍在使用中
        """
        usage_sess = db.query(UsageSession).filter(
            UsageSession.id == session_id,
            UsageSession.user_id == user_id,
            UsageSession.ended_at.is_(None)
        ).first()

        if not usage_sess:
            return None

        usage_sess.last_heartbeat_at = func.now()

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.last_active_at = func.now()

        db.commit()
        db.refresh(usage_sess)
        return usage_sess

    @staticmethod
    def end_session(db: Session, session_id: int, user_id: int) -> dict:
        """
        結束使用 Session，計算使用時長並累加到用戶總時間
        """
        usage_sess = db.query(UsageSession).filter(
            UsageSession.id == session_id,
            UsageSession.user_id == user_id,
            UsageSession.ended_at.is_(None)
        ).first()

        if not usage_sess:
            return {"ok": False, "msg": "Session 不存在或已結束"}

        now = datetime.utcnow()
        usage_sess.ended_at = now

        # NOTE: 使用 started_at 計算完整使用時長
        duration = int((now - usage_sess.started_at).total_seconds())
        usage_sess.duration_seconds = max(duration, 0)

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.total_usage_seconds = (user.total_usage_seconds or 0) + usage_sess.duration_seconds
            user.last_active_at = now

        db.commit()
        return {"ok": True, "duration_seconds": usage_sess.duration_seconds}

    @staticmethod
    def _close_stale_sessions(db: Session, user_id: int) -> None:
        """
        關閉該用戶所有未結束的舊 Session
        避免因異常退出導致的 Session 殘留
        """
        stale_sessions = db.query(UsageSession).filter(
            UsageSession.user_id == user_id,
            UsageSession.ended_at.is_(None)
        ).all()

        now = datetime.utcnow()
        for sess in stale_sessions:
            sess.ended_at = now
            duration = int((now - sess.started_at).total_seconds())
            sess.duration_seconds = max(duration, 0)

            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.total_usage_seconds = (user.total_usage_seconds or 0) + sess.duration_seconds

        if stale_sessions:
            db.commit()

    @staticmethod
    def get_user_usage_stats(db: Session, user_id: int) -> dict:
        """
        取得用戶使用時間統計
        """
        user = db.query(User).filter(User.id == user_id).first()
        total_seconds = user.total_usage_seconds or 0 if user else 0

        session_count = db.query(func.count(UsageSession.id)).filter(
            UsageSession.user_id == user_id
        ).scalar() or 0

        return {
            "total_usage_seconds": total_seconds,
            "session_count": session_count,
            "last_active_at": user.last_active_at if user else None
        }
