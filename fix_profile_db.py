from sqlalchemy import create_engine, text
from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);"))
        print("Added avatar_url column")
    except Exception as e:
        print(f"avatar_url column might already exist: {e}")
    
    conn.commit()
    print("Database migration complete.")
