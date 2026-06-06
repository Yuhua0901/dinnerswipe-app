from fastapi import Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from database import get_db
from core.config import settings
from repository.repos import UserRepository
from model.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token 無效")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token 無效或已過期")
        
    user = UserRepository.get_by_id(db, int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="使用者不存在")
    return user

def admin_guard(x_admin_token: str = Header(None)):
    if x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="需要管理員 Token")

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def get_current_user_optional(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> User | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return UserRepository.get_by_id(db, int(user_id))
    except JWTError:
        return None

