from sqlalchemy import text
from app.database import engine

def add_column():
    with engine.connect() as conn:
        try:
            # conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN resume_text VARCHAR;"))
            conn.execute(text("ALTER TABLE scheduled_interviews ADD COLUMN reminder_12h_sent BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE scheduled_interviews ADD COLUMN reminder_15m_sent BOOLEAN DEFAULT FALSE;"))
            conn.commit()
            print("Columns added successfully.")
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_column()
