from fastapi import APIRouter, HTTPException, Request

from app.db.connection import pool

router = APIRouter(prefix="/history", tags=["Transcript History"])


def get_user_id_from_session(request: Request) -> int:
    user_id = request.session.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="You must be logged in to access transcript history",
        )

    return user_id


@router.get("")
def get_transcript_history(request: Request):
    user_id = get_user_id_from_session(request)

    with pool.connection() as conn:
        transcripts = conn.execute(
            """
            SELECT id, video_url, title, created_at
            FROM saved_transcripts
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()

    return [
        {
            "id": transcript["id"],
            "video_url": transcript["video_url"],
            "title": transcript["title"],
            "created_at": transcript["created_at"].isoformat(),
        }
        for transcript in transcripts
    ]


@router.get("/{transcript_id}")
def get_saved_transcript(transcript_id: int, request: Request):
    user_id = get_user_id_from_session(request)

    with pool.connection() as conn:
        transcript = conn.execute(
            """
            SELECT id, video_url, title, transcript, created_at
            FROM saved_transcripts
            WHERE id = %s AND user_id = %s
            """,
            (transcript_id, user_id),
        ).fetchone()

    if transcript is None:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return {
        "id": transcript["id"],
        "video_url": transcript["video_url"],
        "title": transcript["title"],
        "transcript": transcript["transcript"],
        "created_at": transcript["created_at"].isoformat(),
    }


@router.delete("/{transcript_id}")
def delete_transcript(transcript_id: int, request: Request):
    user_id = get_user_id_from_session(request)

    with pool.connection() as conn:
        deleted = conn.execute(
            """
            DELETE FROM saved_transcripts
            WHERE id = %s AND user_id = %s
            RETURNING id
            """,
            (transcript_id, user_id),
        ).fetchone()

    if deleted is None:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return {"deleted": True, "id": deleted["id"]}
