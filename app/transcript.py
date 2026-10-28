import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://transcriptapi.com/api/v2"


def get_transcript(video_url: str) -> str | None:
    api_key = os.getenv("TRANSCRIPT_API_KEY")
    if not api_key:
        print("Error: TRANSCRIPT_API_KEY is missing")
        return None
    headers = {"Authorization": f"Bearer {api_key}"}
    params = {"video_url": video_url, "language": "en,de,ar", "send_metadata": "true"}

    try:
        response = requests.get(
            f"{BASE_URL}/youtube/transcript", params=params, headers=headers, timeout=30
        )
        response.raise_for_status()
        data = response.json()

        return " ".join(snippet["text"] for snippet in data["transcript"])

    except Exception as error:  # noqa: BLE001
        print(f"ERROR: {error}")
        return None
