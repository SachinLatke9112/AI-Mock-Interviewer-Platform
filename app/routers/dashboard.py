from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.dependencies import get_current_user, get_db
from app.models import User, InterviewSession

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Total interviews completed
    total_interviews = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "Completed"
    ).count()

    # Average score
    avg_score_query = db.query(func.avg(InterviewSession.score)).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "Completed"
    ).scalar()
    
    avg_score = round(avg_score_query, 1) if avg_score_query else 0

    # Mock historical data for AreaChart (Performance Trend)
    # Ideally, we would group by created_at and calculate averages
    performance_trend = [
        {"name": "Interview 1", "score": 65},
        {"name": "Interview 2", "score": 72},
        {"name": "Interview 3", "score": 68},
        {"name": "Interview 4", "score": 85},
        {"name": "Interview 5", "score": avg_score or 75},
    ]

    # Mock skill breakdown for RadarChart
    skill_breakdown = [
        {"subject": "Technical", "A": 85, "fullMark": 100},
        {"subject": "Communication", "A": 90, "fullMark": 100},
        {"subject": "System Design", "A": 75, "fullMark": 100},
        {"subject": "Behavioral", "A": 88, "fullMark": 100},
        {"subject": "Problem Solving", "A": 82, "fullMark": 100},
    ]

    return {
        "readiness_score": avg_score or 75,
        "total_interviews": total_interviews,
        "performance_trend": performance_trend,
        "skill_breakdown": skill_breakdown
    }
