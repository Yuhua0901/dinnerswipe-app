-- DinnerSwipe APP 資料庫初始化腳本 (PostgreSQL / Supabase)
-- 提示：
-- 如果您直接執行 Python 後端伺服器 (DinnerSwipe_Backend.py)，
-- SQLAlchemy 也會自動幫您建立這些資料表。
-- 但如果您想手動在 Supabase 的 SQL Editor 執行，請貼上以下程式碼：

-- 1. 建立使用者資料表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    pw_hash VARCHAR(256) NOT NULL,
    region VARCHAR(64) DEFAULT '台南市東區',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_swipes INTEGER DEFAULT 0,
    reputation INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- 2. 建立刷卡場次資料表
CREATE TABLE IF NOT EXISTS swipe_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood_tags VARCHAR(256) DEFAULT '',
    started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed INTEGER DEFAULT 0
);

-- 3. 建立每張卡的互動紀錄資料表
CREATE TABLE IF NOT EXISTS swipes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES swipe_sessions(id) ON DELETE CASCADE,
    food_name VARCHAR(128) NOT NULL,
    food_zone VARCHAR(64) DEFAULT '',
    action VARCHAR(16) NOT NULL,
    emotion_tag VARCHAR(32) DEFAULT '',
    mood_context VARCHAR(128) DEFAULT '',
    swiped_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_swipes_food ON swipes (food_name);
CREATE INDEX IF NOT EXISTS ix_swipes_user_food ON swipes (user_id, food_name);

-- 4. 建立全體熱度分數資料表
CREATE TABLE IF NOT EXISTS food_scores (
    id SERIAL PRIMARY KEY,
    food_name VARCHAR(128) UNIQUE NOT NULL,
    food_zone VARCHAR(64) DEFAULT '',
    total_right INTEGER DEFAULT 0,
    total_heart INTEGER DEFAULT 0,
    total_left INTEGER DEFAULT 0,
    total_swipes INTEGER DEFAULT 0,
    score DOUBLE PRECISION DEFAULT 0.0,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_food_scores_name ON food_scores (food_name);
