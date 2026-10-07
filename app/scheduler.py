from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import ScheduledInterview
from app.services.email_service import send_interview_reminder_email
from sqlalchemy.orm import joinedload

scheduler = BackgroundScheduler()

def check_and_send_reminders():
    print(f"[{datetime.utcnow()}] Checking for mock interview reminders...")
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        # Look for upcoming scheduled interviews
        interviews = db.query(ScheduledInterview).options(joinedload(ScheduledInterview.user)).filter(
            ScheduledInterview.scheduled_at > now
        ).all()

        for interview in interviews:
            time_diff = interview.scheduled_at - now
            
            # Check 15 minute reminder first to avoid sending both if scheduled <15m away
            if time_diff <= timedelta(minutes=15) and not interview.reminder_15m_sent:
                formatted_time = interview.scheduled_at.strftime("%B %d, %Y at %I:%M %p UTC")
                subject = f"Reminder: Your mock interview for {interview.role} starts in 15 minutes!"
                body = f"Hello {interview.user.name},\n\nGet ready! Your AI mock interview for the role of '{interview.role}' starts in 15 minutes at {formatted_time}.\n\nPlease log into the application now to prepare.\n\nBest,\nInterviewPilot AI Team"
                
                success = send_interview_reminder_email(interview.user.email, subject, body)
                if success:
                    interview.reminder_15m_sent = True
                    interview.reminder_12h_sent = True # Skip 12h email if we already sent 15m
                    db.commit()
                    
            # Otherwise, check 12 hour reminder
            elif time_diff <= timedelta(hours=12) and not interview.reminder_12h_sent:
                formatted_time = interview.scheduled_at.strftime("%B %d, %Y at %I:%M %p UTC")
                subject = f"Reminder: Your mock interview for {interview.role} is in 12 hours!"
                body = f"Hello {interview.user.name},\n\nThis is a reminder that your AI mock interview for the role of '{interview.role}' is scheduled in less than 12 hours at {formatted_time}.\n\nPlease log into the application at the scheduled time to begin your interview.\n\nBest,\nInterviewPilot AI Team"
                
                success = send_interview_reminder_email(interview.user.email, subject, body)
                if success:
                    interview.reminder_12h_sent = True
                    db.commit()

    except Exception as e:
        print(f"Error checking reminders: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(check_and_send_reminders, 'interval', minutes=1)
    scheduler.start()

def stop_scheduler():
    scheduler.shutdown()
