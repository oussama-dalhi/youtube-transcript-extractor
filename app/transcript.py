from youtube_transcript_api import YouTubeTranscriptApi

ytt_api = YouTubeTranscriptApi()


def get_video_id(url: str) -> str | None:
    
    if "youtu.be/" in url:
        start = url.find("youtu.be/") + len("youtu.be/")
        end = url.find("?", start)
        if end == -1:
            return url[start:]

        return url[start:end]
    if "v=" in url:
        start = url.find("v=") + 2
        end = url.find("&", start)
        if end == -1:
            return url[start:]

        return url[start:end]

    return None


def get_transcript(video_id: str) -> str | None:
    try:
        transcript = ytt_api.fetch(
            video_id,
            languages=["en", "de"]
            )
        return " ".join(
            snippet.text
            for snippet in transcript
        )

    except Exception as error:
        return None

