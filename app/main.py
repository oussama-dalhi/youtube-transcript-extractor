import logging

from dotenv import load_dotenv

load_dotenv()
import os
from contextlib import asynccontextmanager
from typing import Annotated

import fastapi
from fastapi.requests import Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, StringConstraints
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.db.connection import pool
from app.limiter import limiter
from app.routes.auth import router as auth_router
from app.routes.history import router as history_router
from app.transcript import TranscriptError, get_transcript

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    pool.open(wait=True)
    try:
        yield
    finally:
        pool.close()


SESSION_SECRET = os.getenv("SESSION_SECRET")
if not SESSION_SECRET:
    raise RuntimeError("SESSION_SECRET is not configured")


app = fastapi.FastAPI(title="YouTube Transcript Extractor", lifespan=lifespan)
app.state.limiter = limiter

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="transcript_session",
    max_age=60 * 60 * 24 * 14,
    same_site="lax",
    https_only=os.getenv("APP_ENV") == "production",
)

app.include_router(auth_router)
app.include_router(history_router)


class TranscriptRequest(BaseModel):
    url: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
    ]


app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.exception_handler(TranscriptError)
async def transcript_error_handler(request: Request, exc: TranscriptError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait a minute and try again."},
    )


@app.get("/")
def root():
    return FileResponse("app/templates/index.html")


@app.post("/transcript")
@limiter.limit("10/minute")
def transcript(request: Request, body: TranscriptRequest):
    result = get_transcript(body.url)

    user_id = request.session.get("user_id")
    saved = False
    if user_id is not None:
        try:
            with pool.connection() as conn:
                conn.execute(
                    """
                    INSERT INTO saved_transcripts (user_id, video_url, transcript, title)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (user_id, body.url, result["transcript"], result["title"]),
                )
            saved = True
        except Exception:
            logger.exception("Failed to save transcript for user_id=%s", user_id)
    return {
        "video_url": body.url,
        "transcript": result["transcript"],
        "title": result["title"],
        "saved": saved,
    }
