from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
import re

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("Password must contain at least one letter")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    bio: str | None = None
    resume_filename: str | None = None
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    bio: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str


class InterviewStartRequest(BaseModel):
    role: str
    level: str
    focus: str
    job_description: str | None = None
    resume_text: str | None = None


class UploadResumeResponse(BaseModel):
    resume_text: str


class AnswerSubmitRequest(BaseModel):
    answer: str


class QuestionResponse(BaseModel):
    id: int
    text: str


class InterviewStartResponse(BaseModel):
    session_id: int
    question: QuestionResponse


class AnswerEvaluationResponse(BaseModel):
    feedback: str
    score: float
    next_question: QuestionResponse


class SkillScoreSchema(BaseModel):
    category: str
    score: float

class ImprovementSchema(BaseModel):
    issue: str
    action_item: str

class SessionSummaryResponse(BaseModel):
    overall_score: float
    readiness_verdict: str | None = None
    readiness_summary: str | None = None
    strengths: list[str]
    improvements: list[ImprovementSchema] | list[str] # allow both for backward compatibility
    skill_scores: list[SkillScoreSchema] = []
    recommendation: str | None = None


class SessionHistoryResponse(BaseModel):
    id: int
    role: str
    date: str
    score: float | None = None
    status: str


class ScheduledInterviewResponse(BaseModel):
    id: int
    role: str
    scheduled_at: datetime


class ScheduledInterviewCreate(BaseModel):
    role: str
    scheduled_at: datetime


class PerformanceTrendSchema(BaseModel):
    name: str
    score: float


class DashboardMetricsResponse(BaseModel):
    total_interviews: int
    average_score: float
    top_strength: str | None
    area_to_improve: str | None
    performance_trend: list[PerformanceTrendSchema]
    recent_sessions: list[SessionHistoryResponse]
    skill_radar: list[SkillScoreSchema] = []
    action_plan: list[str] = []
    next_interview: ScheduledInterviewResponse | None = None

class QnASchema(BaseModel):
    question: str
    answer: str | None
    feedback: str | None
    score: float | None

class InterviewReportResponse(BaseModel):
    id: int
    role: str
    level: str
    focus: str
    score: float | None
    status: str
    strengths: list[str]
    improvements: list[str]
    qnas: list[QnASchema]


class SidebarDataResponse(BaseModel):
    streak: int
    in_progress_session_id: int | None = None

class CurrentSessionStateResponse(BaseModel):
    role: str
    level: str
    focus: str
    current_question: QuestionResponse | None
    history: list[QnASchema]

class TrendData(BaseModel):
    name: str # e.g. Month or Date
    score: float
    average: float = 65.0

class CategoryEffortData(BaseModel):
    name: str
    questions: int

class RadarData(BaseModel):
    subject: str
    A: float # The score
    fullMark: int = 100

class AnalyticsDashboardResponse(BaseModel):
    longTermTrend: list[TrendData]
    timeSpentData: list[CategoryEffortData]
    radarData: list[RadarData]

class AchievementSchema(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    unlocked: bool
    unlockedAt: str | None = None