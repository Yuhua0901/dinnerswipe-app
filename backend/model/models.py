from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    pw_hash = Column(String(256), nullable=False)
    region = Column(String(64), default="台南市東區")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    total_swipes = Column(Integer, default=0)
    reputation = Column(Integer, default=0)
    
    swipes = relationship("Swipe", back_populates="user")
    sessions = relationship("SwipeSession", back_populates="user")

class SwipeSession(Base):
    __tablename__ = "swipe_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mood_tags = Column(String(256), default="")
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed = Column(Integer, default=0)
    
    user = relationship("User", back_populates="sessions")
    swipes = relationship("Swipe", back_populates="session")

class Swipe(Base):
    __tablename__ = "swipes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("swipe_sessions.id"), nullable=False)
    food_name = Column(String(128), nullable=False)
    food_zone = Column(String(64), default="")
    action = Column(String(16), nullable=False)
    emotion_tag = Column(String(32), default="")
    mood_context = Column(String(128), default="")
    swiped_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="swipes")
    session = relationship("SwipeSession", back_populates="swipes")

# 建立索引以加速查詢
Index("ix_swipes_food", Swipe.food_name)
Index("ix_swipes_user_food", Swipe.user_id, Swipe.food_name)

class FoodScore(Base):
    __tablename__ = "food_scores"
    
    id = Column(Integer, primary_key=True)
    food_name = Column(String(128), unique=True, index=True)
    food_zone = Column(String(64), default="")
    total_right = Column(Integer, default=0)
    total_heart = Column(Integer, default=0)
    total_left = Column(Integer, default=0)
    total_swipes = Column(Integer, default=0)
    score = Column(Float, default=0.0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
