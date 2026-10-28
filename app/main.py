import fastapi
from fastapi import HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.transcript import get_transcript

app = fastapi.FastAPI(title="Youtube Transcript API")


class TranscriptRequest(BaseModel):
    url: str


app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/")
def root():
    return FileResponse("app/templates/index.html")


@app.post("/transcript")
def transcript(request: TranscriptRequest):
    if not request.url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The provided url can't be empty",
        )

    result = get_transcript(request.url)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not retrieve transcript from the provided link. Ensure captions exist or the video is public.",
        )
    return {"video_url": request.url, "transcript": result}
