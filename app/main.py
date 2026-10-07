from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from contextlib import asynccontextmanager

from app.database import Base, engine
import app.models
from app.limiter import limiter
from app.routers import auth, interview, profile
from app.scheduler import start_scheduler, stop_scheduler
from app.config import FRONTEND_URL
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the scheduler when app starts
    start_scheduler()
    yield
    # Stop the scheduler when app stops
    stop_scheduler()

app = FastAPI(
    title="InterviewPilot AI",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the exception here in a real production setup
    print(f"Global exception caught: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

@app.get("/healthz", tags=["Health"])
def health_check():
    return {"status": "ok"}

# Ensure uploads directory exists
os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/api/v1/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

api_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(interview.router, prefix=api_prefix)
app.include_router(profile.router, prefix=api_prefix)

# Serve the static frontend assets
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.isdir(os.path.join(frontend_dist, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

# SPA Fallback for all other routes
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    dist_path = os.path.join(frontend_dist, full_path)
    if os.path.isfile(dist_path):
        return FileResponse(dist_path)
        
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
        
    return {"message": "Frontend not built yet. Please run npm run build in the frontend directory."}