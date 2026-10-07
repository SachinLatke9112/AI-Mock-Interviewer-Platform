from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
import tempfile
import os

from app.limiter import limiter
from app.dependencies import get_db, get_current_user
from app.models import User, InterviewSession, Question, Insight, SkillScore, ScheduledInterview
from app.services.email_service import send_interview_reminder_email
from app.schemas import (
    InterviewStartRequest,
    AnswerSubmitRequest,
    QuestionResponse,
    InterviewStartResponse,
    AnswerEvaluationResponse,
    SessionSummaryResponse,
    UploadResumeResponse,
    DashboardMetricsResponse,
    SessionHistoryResponse,
    InterviewReportResponse,
    SidebarDataResponse,
    CurrentSessionStateResponse,
    AnalyticsDashboardResponse,
    ScheduledInterviewResponse,
    ScheduledInterviewCreate
)
from app.utils.file_parser import extract_text_from_file
from app.services.ai_services import (
    generate_first_question,
    evaluate_answer_and_generate_next,
    generate_session_summary,
    transcribe_audio
)

router = APIRouter(prefix="/interviews", tags=["interviews"])

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    db.delete(session)
    db.commit()
    return None

@router.get("/history", response_model=List[SessionHistoryResponse])
def get_interview_history(role: Optional[str] = None, skip: int = 0, limit: int = 20, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(InterviewSession).filter(InterviewSession.user_id == current_user.id)
    if role and role != "All":
        query = query.filter(InterviewSession.role == role)
    sessions = query.order_by(InterviewSession.created_at.desc()).offset(skip).limit(limit).all()
    history = []
    for session in sessions:
        history.append({
            "id": session.id,
            "role": session.role,
            "date": session.created_at.strftime("%Y-%m-%d"),
            "score": session.score,
            "status": session.status
        })
    return history

@router.get("/dashboard/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(role: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Helper to apply role filter
    def apply_role_filter(q):
        if role and role != "All":
            return q.filter(InterviewSession.role == role)
        return q

    # 1. Total Interviews
    total_interviews = apply_role_filter(db.query(InterviewSession).filter(InterviewSession.user_id == current_user.id)).count()
    
    # 2. Average Score
    avg_query = db.query(func.avg(InterviewSession.score)).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "Completed"
    )
    avg_score = apply_role_filter(avg_query).scalar() or 0.0

    # 3. Recent Sessions (last 10)
    sessions = apply_role_filter(db.query(InterviewSession).filter(InterviewSession.user_id == current_user.id)).order_by(InterviewSession.created_at.desc()).limit(10).all()
    
    recent_sessions = []
    performance_trend = []
    
    for session in sessions:
        recent_sessions.append({
            "id": session.id,
            "role": session.role,
            "date": session.created_at.strftime("%Y-%m-%d"),
            "score": session.score,
            "status": session.status
        })
        if session.status == "Completed" and session.score is not None:
            # We will insert at the beginning so the chart goes left-to-right from oldest to newest
            performance_trend.insert(0, {
                "name": session.created_at.strftime("%b %d"),
                "score": session.score
            })
            
    # 4. Top Strength & Improvement
    # We fetch the most recent strength and improvement
    strength_query = db.query(Insight).join(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        Insight.type == "strength"
    )
    top_strength = apply_role_filter(strength_query).order_by(Insight.id.desc()).first()
    
    improvement_query = db.query(Insight).join(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        Insight.type == "improvement"
    )
    area_to_improve = apply_role_filter(improvement_query).order_by(Insight.id.desc()).first()
    
    # 5. Skill Radar (average category scores)
    skill_radar = []
    category_scores_query = db.query(
        SkillScore.category, 
        func.avg(SkillScore.score)
    ).join(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "Completed"
    )
    category_scores = apply_role_filter(category_scores_query).group_by(SkillScore.category).all()
    
    for cat, score in category_scores:
        skill_radar.append({
            "category": cat,
            "score": round(score, 1)
        })
    # 6. Action Plan (Top 3 recent improvements)
    action_plan = []
    recent_improvements = apply_role_filter(improvement_query).order_by(Insight.id.desc()).limit(3).all()
    for imp in recent_improvements:
        action_plan.append(imp.text)
        
    if not action_plan:
        action_plan = ["Complete your first interview to get personalized feedback!"]
        
    # 7. Next Scheduled Interview
    next_int = db.query(ScheduledInterview).filter(
        ScheduledInterview.user_id == current_user.id,
        ScheduledInterview.scheduled_at >= datetime.utcnow()
    ).order_by(ScheduledInterview.scheduled_at.asc()).first()
    
    next_interview = None
    if next_int:
        next_interview = ScheduledInterviewResponse(
            id=next_int.id,
            role=next_int.role,
            scheduled_at=next_int.scheduled_at
        )
    
    return DashboardMetricsResponse(
        total_interviews=total_interviews,
        average_score=round(avg_score, 1),
        top_strength=top_strength.text if top_strength else None,
        area_to_improve=area_to_improve.text if area_to_improve else None,
        performance_trend=performance_trend,
        recent_sessions=recent_sessions,
        skill_radar=skill_radar,
        action_plan=action_plan,
        next_interview=next_interview
    )

@router.get("/sidebar", response_model=SidebarDataResponse)
def get_sidebar_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    in_progress = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "In Progress"
    ).order_by(InterviewSession.created_at.desc()).first()
    
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "Completed"
    ).order_by(InterviewSession.created_at.desc()).all()
    
    unique_dates = sorted(list(set([s.created_at.date() for s in sessions])), reverse=True)
    
    streak = 0
    today = datetime.utcnow().date()
    
    if unique_dates:
        if unique_dates[0] >= today - timedelta(days=1):
            streak = 1
            current_date = unique_dates[0]
            for d in unique_dates[1:]:
                if current_date - d == timedelta(days=1):
                    streak += 1
                    current_date = d
                else:
                    break
                    
    return SidebarDataResponse(
        streak=streak,
        in_progress_session_id=in_progress.id if in_progress else None
    )

MAX_RESUME_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_RESUME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
]

@router.post("/upload-resume", response_model=UploadResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if file.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, DOCX, and TXT are allowed.")
        
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_RESUME_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    text = await extract_text_from_file(file)
    return UploadResumeResponse(resume_text=text)

@router.post("/start", response_model=InterviewStartResponse)
@limiter.limit("10/minute")
def start_interview(
    request: Request,
    payload: InterviewStartRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        question_text = generate_first_question(
            payload.role, 
            payload.level, 
            payload.focus, 
            payload.resume_text,
            payload.job_description
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate question: {str(e)}")

    session = InterviewSession(
        user_id=current_user.id,
        role=payload.role,
        level=payload.level,
        focus=payload.focus,
        job_description=payload.job_description,
        resume_text=payload.resume_text,
        status="In Progress"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    question = Question(
        session_id=session.id,
        text=question_text
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    
    return InterviewStartResponse(
        session_id=session.id,
        question=QuestionResponse(id=question.id, text=question.text)
    )

@router.post("/transcribe")
@limiter.limit("20/minute")
async def transcribe_speech(
    request: Request,
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name

        text = transcribe_audio(tmp_path)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.post("/{session_id}/answer/{question_id}", response_model=AnswerEvaluationResponse)
@limiter.limit("20/minute")
def submit_answer(
    request: Request,
    session_id: int,
    question_id: int,
    payload: AnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    current_question = db.query(Question).filter(Question.id == question_id, Question.session_id == session_id).first()
    if not current_question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    # Get all past Q&As
    all_questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.id).all()
    # CHANGED: topic_tag is now included so the AI knows which competencies were already covered
    past_qas = [
        {"question": q.text, "answer": q.answer, "topic_tag": q.topic_tag}
        for q in all_questions if q.id != question_id and q.answer
    ]
    
    try:
        evaluation = evaluate_answer_and_generate_next(
            role=session.role,
            level=session.level,
            focus=session.focus,
            past_qas=past_qas,
            new_answer=payload.answer,
            resume_text=session.resume_text,
            job_description=session.job_description,
            current_question=current_question.text,   # NEW: tells the AI which question was answered
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI evaluation failed: {str(e)}")
        
    current_question.answer = payload.answer
    current_question.feedback = evaluation.get("feedback")
    current_question.score = evaluation.get("score")
    current_question.topic_tag = evaluation.get("topic_tag")   # NEW: save the topic of this answer
    db.commit()
    
    next_question_text = evaluation.get("next_question", "Thank you, that concludes our interview.")
    
    next_question = Question(
        session_id=session.id,
        text=next_question_text
    )
    db.add(next_question)
    db.commit()
    db.refresh(next_question)
    
    next_q_response = QuestionResponse(id=next_question.id, text=next_question.text)
    
    return AnswerEvaluationResponse(
        feedback=current_question.feedback,
        score=current_question.score,
        next_question=next_q_response
    )

@router.post("/{session_id}/finish", response_model=SessionSummaryResponse)
@limiter.limit("10/minute")
def finish_interview(
    request: Request,
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    all_questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.id).all()
    
    # CHANGED: topic_tag is now included so the summary knows which competencies were tested
    qas = [
        {"question": q.text, "answer": q.answer, "score": q.score, "topic_tag": q.topic_tag}
        for q in all_questions if q.answer
    ]
    
    try:
        summary = generate_session_summary(role=session.role, level=session.level, qas=qas, resume_text=session.resume_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI summary generation failed: {str(e)}")
        
    session.score = summary.get("overall_score", 0.0)
    session.status = "Completed"
    
    for strength in summary.get("strengths", []):
        insight = Insight(session_id=session.id, type="strength", text=strength)
        db.add(insight)
        
    for improvement in summary.get("improvements", []):
        imp_text = f"{improvement['issue']} (Action: {improvement['action_item']})" if isinstance(improvement, dict) else improvement
        insight = Insight(session_id=session.id, type="improvement", text=imp_text)
        db.add(insight)
        
    for skill in summary.get("skill_scores", []):
        ss = SkillScore(session_id=session.id, category=skill.get("category"), score=skill.get("score"))
        db.add(ss)
        
    db.commit()
    
    return SessionSummaryResponse(
        overall_score=session.score,
        strengths=summary.get("strengths", []),
        improvements=summary.get("improvements", []),
        skill_scores=summary.get("skill_scores", [])
    )

@router.get("/{session_id}/report", response_model=InterviewReportResponse)
def get_interview_report(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.id).all()
    qnas = []
    for q in questions:
        qnas.append({
            "question": q.text,
            "answer": q.answer,
            "feedback": q.feedback,
            "score": q.score
        })
        
    strengths = [i.text for i in db.query(Insight).filter(Insight.session_id == session_id, Insight.type == "strength").all()]
    improvements = [i.text for i in db.query(Insight).filter(Insight.session_id == session_id, Insight.type == "improvement").all()]
    
    return InterviewReportResponse(
        id=session.id,
        role=session.role,
        level=session.level,
        focus=session.focus,
        score=session.score,
        status=session.status,
        strengths=strengths,
        improvements=improvements,
        qnas=qnas
    )

@router.get("/{session_id}/current", response_model=CurrentSessionStateResponse)
def get_current_session_state(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    all_questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.id).all()
    
    history = []
    current_question = None
    
    for q in all_questions:
        if q.answer is not None:
            history.append({
                "question": q.text,
                "answer": q.answer,
                "feedback": q.feedback,
                "score": q.score
            })
        else:
            current_question = {"id": q.id, "text": q.text}
            
    return CurrentSessionStateResponse(
        role=session.role,
        level=session.level,
        focus=session.focus,
        current_question=current_question,
        history=history
    )

@router.get("/dashboard/analytics", response_model=AnalyticsDashboardResponse)
def get_analytics(
    role: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "Completed"
    )
    
    if role and role not in ["All", "All Roles"]:
        query = query.filter(InterviewSession.role == role)
        
    sessions = query.order_by(InterviewSession.created_at.asc()).all()
    
    # 1. Long Term Trend
    # Group by month (e.g., 'Jan', 'Feb')
    trend_dict = {}
    for session in sessions:
        if session.score is not None:
            month = session.created_at.strftime("%b")
            if month not in trend_dict:
                trend_dict[month] = []
            trend_dict[month].append(session.score)
            
    trend_data = []
    # If no data, return empty to let frontend handle it or provide a flatline
    for month, scores in trend_dict.items():
        avg_score = sum(scores) / len(scores)
        trend_data.append({"name": month, "score": round(avg_score, 1), "average": 65.0})
        
    if not trend_data:
        # Provide fallback so charts don't crash
        current_month = datetime.utcnow().strftime("%b")
        trend_data = [{"name": current_month, "score": 0, "average": 65.0}]

    # 2. Time Spent (Questions Answered per Category)
    # Group by focus area, fallback to role
    category_dict = {}
    for session in sessions:
        cat_name = session.focus if session.focus else session.role
        if not cat_name:
            cat_name = "General"
        
        # Count answered questions in this session
        q_count = len([q for q in session.questions if q.answer is not None])
        
        if cat_name not in category_dict:
            category_dict[cat_name] = 0
        category_dict[cat_name] += q_count
        
    time_spent_data = [{"name": k, "questions": v} for k, v in category_dict.items()]
    
    if not time_spent_data:
        time_spent_data = [{"name": "No Data", "questions": 0}]

    # 3. Radar Data (Competency Matrix)
    radar_dict = {}
    radar_counts = {}
    for session in sessions:
        for skill in session.skill_scores:
            cat = skill.category
            if cat not in radar_dict:
                radar_dict[cat] = 0
                radar_counts[cat] = 0
            radar_dict[cat] += skill.score
            radar_counts[cat] += 1
            
    radar_data = []
    for cat, total in radar_dict.items():
        avg = total / radar_counts[cat]
        radar_data.append({"subject": cat, "A": round(avg, 1), "fullMark": 100})
        
    if not radar_data:
        # Fallback
        radar_data = [
            {"subject": "Technical", "A": 0, "fullMark": 100},
            {"subject": "Communication", "A": 0, "fullMark": 100},
            {"subject": "Problem Solving", "A": 0, "fullMark": 100}
        ]
        
    return AnalyticsDashboardResponse(
        longTermTrend=trend_data,
        timeSpentData=time_spent_data,
        radarData=radar_data
    )

@router.get("/scheduled", response_model=List[ScheduledInterviewResponse])
def get_scheduled_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scheduled = db.query(ScheduledInterview).filter(
        ScheduledInterview.user_id == current_user.id,
        ScheduledInterview.scheduled_at >= datetime.utcnow()
    ).order_by(ScheduledInterview.scheduled_at.asc()).all()
    return scheduled

@router.post("/schedule", response_model=ScheduledInterviewResponse)
def schedule_interview(
    data: ScheduledInterviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure datetime is naive UTC before saving to database
    # This prevents psycopg2 from converting it to the local timezone
    scheduled_time = data.scheduled_at
    if scheduled_time.tzinfo is not None:
        # Convert to UTC then remove tzinfo
        from datetime import timezone
        scheduled_time = scheduled_time.astimezone(timezone.utc).replace(tzinfo=None)

    new_int = ScheduledInterview(
        user_id=current_user.id,
        role=data.role,
        scheduled_at=scheduled_time
    )
    db.add(new_int)
    db.commit()
    db.refresh(new_int)
    
    return ScheduledInterviewResponse(
        id=new_int.id,
        role=new_int.role,
        scheduled_at=new_int.scheduled_at
    )

@router.put("/schedule/{schedule_id}", response_model=ScheduledInterviewResponse)
def update_scheduled_interview(
    schedule_id: int,
    data: ScheduledInterviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    int_obj = db.query(ScheduledInterview).filter(ScheduledInterview.id == schedule_id, ScheduledInterview.user_id == current_user.id).first()
    if not int_obj:
        raise HTTPException(status_code=404, detail="Scheduled interview not found")

    scheduled_time = data.scheduled_at
    if scheduled_time.tzinfo is not None:
        from datetime import timezone
        scheduled_time = scheduled_time.astimezone(timezone.utc).replace(tzinfo=None)

    int_obj.role = data.role
    int_obj.scheduled_at = scheduled_time
    
    # Reset reminders if time is updated
    int_obj.reminder_12h_sent = False
    int_obj.reminder_15m_sent = False
    
    db.commit()
    db.refresh(int_obj)
    
    # Send reschedule email
    formatted_time = int_obj.scheduled_at.strftime("%B %d, %Y at %I:%M %p UTC")
    subject = f"Rescheduled: Your mock interview for {int_obj.role}"
    body = f"Hello {current_user.name},\n\nYour AI mock interview for the role of '{int_obj.role}' has been successfully rescheduled.\n\nNew Time: {formatted_time}\n\nPlease log into the application at the new scheduled time to begin your interview.\n\nBest,\nInterviewPilot AI Team"
    send_interview_reminder_email(current_user.email, subject, body)
    
    return ScheduledInterviewResponse(
        id=int_obj.id,
        role=int_obj.role,
        scheduled_at=int_obj.scheduled_at
    )

@router.delete("/schedule/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scheduled_interview(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    int_obj = db.query(ScheduledInterview).filter(ScheduledInterview.id == schedule_id, ScheduledInterview.user_id == current_user.id).first()
    if not int_obj:
        raise HTTPException(status_code=404, detail="Scheduled interview not found")
        
    db.delete(int_obj)
    db.commit()
    return None