import os
import re
import threading

import requests
from cachetools import TTLCache
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://transcriptapi.com/api/v2"

_cache = TTLCache[str, str](maxsize=500, ttl=60 * 60 * 24) 
_cache_lock = threading.Lock()

_SOUND_TAGS = re.compile(r"\[[^\]]*\]")
class TranscriptError(Exception):
    def __init__(self, message: str, status_code: int = 503):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

def _clean(text: str) -> str:
    text = _SOUND_TAGS.sub("", text)
    return re.sub(r"\s+", " ", text).strip()

def get_transcript(video_url: str) -> str:
    key = video_url.strip()

    with _cache_lock:
        cached = _cache.get(key)
    if cached is not None:
        return cached

    text = _fetch_transcript(key)
    with _cache_lock:
        _cache[key] = text
    return text

def _fetch_transcript(video_url: str) -> str:
    api_key = os.getenv("TRANSCRIPT_API_KEY")
    if not api_key:
        print("Error: TRANSCRIPT_API_KEY is missing")
        raise TranscriptError("Transcript service is not configured.")
    
    headers = {"Authorization": f"Bearer {api_key}"}
    params = {"video_url": video_url, "language": "en,de,ar,asr"}

    try:
        response = requests.get(
            f"{BASE_URL}/youtube/transcript", params=params, headers=headers, timeout=30
        )
    except requests.RequestException as error:
        raise TranscriptError("Transcript service is unavailable.") from error

    if response.status_code == 404:
        raise TranscriptError("No transcript found.", 404)

    if response.status_code == 422:
        raise TranscriptError("Invalid YouTube URL.", 422)

    if response.status_code == 402:
        print("TranscriptAPI credits exhausted")
        raise TranscriptError("Transcript API quota exhausted.")

    if not response.ok:
        print(f"TranscriptAPI error {response.status_code}: {response.text[:200]}")
        raise TranscriptError("Failed to retrieve transcript.")

    try:
        data = response.json()
        text = _clean(" ".join(segment["text"] for segment in data["transcript"]))
    except (ValueError, KeyError, TypeError) as error:
        raise TranscriptError("Invalid response from transcript service.") from error
    if not text:
        raise TranscriptError("This video has no transcript.", 404)
    return text
