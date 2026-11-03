
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_username_normalized
        CHECK (
            username = LOWER(BTRIM(username))
            AND CHAR_LENGTH(username) > 0
        )
);

CREATE TABLE IF NOT EXISTS saved_transcripts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    title TEXT,
    transcript TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT video_url_not_empty
        CHECK (CHAR_LENGTH(BTRIM(video_url)) > 0),

    CONSTRAINT transcript_not_empty
        CHECK (CHAR_LENGTH(BTRIM(transcript)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_saved_transcripts_user_created
ON saved_transcripts (user_id, created_at DESC, id DESC);


