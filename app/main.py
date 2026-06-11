from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.transcript import get_video_id, get_transcript
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranscriptRequest(BaseModel):
    url: str

app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
def root():
    return FileResponse("app/templates/index.html");


@app.post("/transcript")
def transcript(request: TranscriptRequest):
    video_id = get_video_id(request.url)
    if not video_id:
        return {
            "success": False,
            "error": "Invalid Youtube Url"
        }
    result = get_transcript(video_id)
    if not result:
        return {
            "success": False,
            "error": "Could not retrieve transcript"
        }
    return {
        "success": True,
        "video_id": video_id,
        "transcript": result
    }
