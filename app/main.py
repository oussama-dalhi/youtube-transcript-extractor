from typing import Annotated

import fastapi
from fastapi.requests import Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, StringConstraints
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.transcript import TranscriptError, get_transcript

limiter = Limiter(key_func=get_remote_address)
app = fastapi.FastAPI(title="Youtube Transcript API")
app.state.limiter = limiter

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
    return {"video_url": body.url, "transcript": get_transcript(body.url)}
