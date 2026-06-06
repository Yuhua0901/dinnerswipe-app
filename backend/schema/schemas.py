from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime

class RegisterReq(BaseModel):
    name: str
    email: str
    password: str
    region: Optional[str] = "台南市東區"

class LoginReq(BaseModel):
    name: str
    password: str

class Token(BaseModel):
    token: str
    user_id: int
    name: str

class UserProfile(BaseModel):
    id: int
    name: str
    email: EmailStr
    region: str
    total_swipes: int
    reputation: int
    created_at: datetime

class LocationUpdateReq(BaseModel):
    lat: float
    lng: float

class SwipeItem(BaseModel):
    food_name: str
    food_zone: str = ""
    action: str
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

class RecommendationResult(BaseModel):
    food_name: str
    final_score: float
    personal_score: float
    community_score: float
    context_score: float
    weights: Dict[str, float]

class LeaderboardItem(BaseModel):
    rank: int
    food_name: str
    food_zone: str
    score: float
    total_right: int
    total_left: int
    heart_rate: float
