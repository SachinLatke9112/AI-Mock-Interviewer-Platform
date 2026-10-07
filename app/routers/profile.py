from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.dependencies import get_current_user, get_db
from app.models import User, InterviewSession, SkillScore
from app.schemas import UserResponse, AchievementSchema, ProfileUpdateRequest
from app.utils.file_parser import extract_text_from_file

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_profile(data: ProfileUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi import HTTPException
    
    if data.name is not None:
        current_user.name = data.name
    if data.email is not None and data.email != current_user.email:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken.")
        current_user.email = data.email
    if data.bio is not None:
        current_user.bio = data.bio
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/resume", response_model=UserResponse)
async def upload_profile_resume(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    text = await extract_text_from_file(file)
    current_user.resume_text = text
    current_user.resume_filename = file.filename
    
    db.commit()
    db.refresh(current_user)
    return current_user

import os
import shutil

MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2 MB
ALLOWED_AVATAR_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png"
}

@router.post("/avatar", response_model=UserResponse)
async def upload_avatar(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi import HTTPException
    
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="Invalid image type. Only JPG and PNG are allowed.")
        
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 2MB.")

    # Save the file to uploads/avatars
    file_extension = ALLOWED_AVATAR_TYPES[file.content_type]
    file_name = f"{current_user.id}{file_extension}"
    file_path = os.path.join("uploads", "avatars", file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    current_user.avatar_url = f"/uploads/avatars/{file_name}"
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/achievements", response_model=list[AchievementSchema])
def get_achievements(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    achievements = []
    
    # Check "First Steps" (>= 1 completed session)
    first_session = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "Completed"
    ).order_by(InterviewSession.created_at.asc()).first()
    
    unlocked_first = first_session is not None
    unlocked_at_first = first_session.created_at.strftime("%b %d, %Y") if unlocked_first else None
    
    achievements.append({
        "id": "first-steps",
        "title": "First Steps",
        "description": "Complete your first mock interview.",
        "icon": "Medal",
        "unlocked": unlocked_first,
        "unlockedAt": unlocked_at_first
    })
    
    # Check "Domain Expert" (>= 90% score in any category)
    high_score = db.query(SkillScore).join(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "Completed",
        SkillScore.score >= 90
    ).first()
    
    unlocked_expert = high_score is not None
    # We don't have created_at on skill_score easily, so just use today or omit
    unlocked_at_expert = datetime.utcnow().strftime("%b %d, %Y") if unlocked_expert else None
    
    achievements.append({
        "id": "domain-expert",
        "title": "Domain Expert",
        "description": "Score 90%+ in a technical category.",
        "icon": "Target",
        "unlocked": unlocked_expert,
        "unlockedAt": unlocked_at_expert
    })
    
    # Check "Unstoppable" (>= 7 day streak)
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
            for date in unique_dates[1:]:
                if current_date - date == timedelta(days=1):
                    streak += 1
                    current_date = date
                elif current_date - date > timedelta(days=1):
                    break
                    
    unlocked_unstoppable = streak >= 7
    unlocked_at_unstoppable = today.strftime("%b %d, %Y") if unlocked_unstoppable else None
    
    achievements.append({
        "id": "unstoppable",
        "title": "Unstoppable",
        "description": "Hit a 7-day streak.",
        "icon": "Flame",
        "unlocked": unlocked_unstoppable,
        "unlockedAt": unlocked_at_unstoppable
    })
    
    return achievements