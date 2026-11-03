from typing import Annotated

from fastapi import APIRouter, HTTPException, Request
from pwdlib import PasswordHash
from pydantic import BaseModel, StringConstraints

from app.db.connection import pool
from app.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

password_hasher = PasswordHash.recommended()

DUMMY_HASH = password_hasher.hash("dummy_password")


class RegisterRequest(BaseModel):
    name: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            min_length=2,
            max_length=100,
        ),
    ]
    username: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            min_length=3,
            max_length=50,
            pattern=r"^[a-zA-Z0-9_-]+$",
            to_lower=True,
        ),
    ]
    password: Annotated[str, StringConstraints(min_length=8, max_length=100)]


class LoginRequest(BaseModel):
    username: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            min_length=3,
            max_length=50,
            pattern=r"^[a-zA-Z0-9_-]+$",
            to_lower=True,
        ),
    ]
    password: Annotated[str, StringConstraints(min_length=1, max_length=100)]


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
def register(body: RegisterRequest, request: Request):
    username = body.username
    hashed_password = password_hasher.hash(body.password)

    with pool.connection() as conn:
        user = conn.execute(
            """
            INSERT INTO users (name, username, password_hash)
            VALUES (%s, %s, %s)
            ON CONFLICT (username) DO NOTHING
            RETURNING id, name, username
        """,
            (body.name, username, hashed_password),
        ).fetchone()
    if user is None:
        raise HTTPException(status_code=409, detail="Username already exists")

    request.session.clear()
    request.session["user_id"] = user["id"]
    return {"id": user["id"], "name": user["name"], "username": user["username"]}


@router.post("/login")
@limiter.limit("5/minute")
def login(body: LoginRequest, request: Request):
    username = body.username

    with pool.connection() as conn:
        user = conn.execute(
            """
            SELECT id, name, username, password_hash
            FROM users
            WHERE username = %s
            """,
            (username,),
        ).fetchone()
    if user is None:
        password_hasher.verify(body.password, DUMMY_HASH)
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not password_hasher.verify(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    request.session.clear()
    request.session["user_id"] = user["id"]
    return {"id": user["id"], "username": user["username"], "name": user["name"]}


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "You have been logged out successfully"}


@router.get("/me")
def me(request: Request):
    user_id = request.session.get("user_id")

    if user_id is None:
        return {"authenticated": False}
    with pool.connection() as conn:
        user = conn.execute(
            """
            SELECT id, username, name FROM users WHERE id = %s
            """,
            (user_id,),
        ).fetchone()
    if user is None:
        request.session.clear()
        return {"authenticated": False}
    return {
        "authenticated": True,
        "id": user["id"],
        "username": user["username"],
        "name": user["name"],
    }
