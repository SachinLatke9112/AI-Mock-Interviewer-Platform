from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Float
from sqlalchemy import Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False
    )

    password = Column(
        String(255),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    bio = Column(String(500), nullable=True)
    resume_filename = Column(String(255), nullable=True)
    resume_text = Column(String, nullable=True)
    avatar_url = Column(String(255), nullable=True)

    sessions = relationship("InterviewSession", back_populates="user")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String(100), nullable=False)
    level = Column(String(50))
    focus = Column(String(50))
    job_description = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    status = Column(String(50), default="Pending")
    resume_text = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    questions = relationship("Question", back_populates="session", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="session", cascade="all, delete-orphan")
    skill_scores = relationship("SkillScore", back_populates="session", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"))
    text = Column(Text, nullable=False)              # CHANGED: was String(500)
    answer = Column(Text, nullable=True)             # CHANGED: was String(2000)
    feedback = Column(Text, nullable=True)           # CHANGED: was String(2000)
    topic_tag = Column(String(150), nullable=True)   # NEW: competency this answer was assessed on
    score = Column(Float, nullable=True)

    session = relationship("InterviewSession", back_populates="questions")


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"))
    type = Column(String(50))  # e.g., 'strength', 'improvement', 'recommendation'
    text = Column(String(500), nullable=False)

    session = relationship("InterviewSession", back_populates="insights")

class SkillScore(Base):
    __tablename__ = "skill_scores"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"))
    category = Column(String(100), nullable=False)
    score = Column(Float, nullable=False)
    session = relationship("InterviewSession", back_populates="skill_scores")

class ScheduledInterview(Base):
    __tablename__ = "scheduled_interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String(100), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    reminder_12h_sent = Column(Boolean, default=False)
    reminder_15m_sent = Column(Boolean, default=False)

    user = relationship("User")