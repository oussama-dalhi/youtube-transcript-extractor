from youtube_transcript_api import YouTubeTranscriptApi

ytt_api = YouTubeTranscriptApi()


def get_video_id(url: str) -> str | None:
    start = -1

    for i in range(len(url)):
        if url[i] == "=":
            start = i + 1
            break

    if start == -1:
        return None

    result = ""

    for i in range(start, len(url)):
        if url[i] == "&":
            break

        result += url[i]

    return result


def get_transcript(video_id: str) -> str | None:
    try:
        transcript = ytt_api.fetch(video_id)

        return " ".join(
            snippet.text
            for snippet in transcript
        )

    except Exception as error:
        print(error)
        return None


if __name__ == "__main__":
    video_id = "sa-vnKzVQJE"

    transcript = get_transcript(video_id)

    if transcript:
        print(transcript[:500])
