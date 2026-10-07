from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:admin123@localhost:5432/ai_interview_db')
with engine.connect() as conn:
    conn.execute(text('ALTER TABLE interview_sessions ADD COLUMN job_description TEXT;'))
    conn.commit()
print('Database altered successfully.')
