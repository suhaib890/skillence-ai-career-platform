"""Authentication, signed session tokens and role-based access control.

Tokens are HMAC-SHA256 signed (stdlib only — no extra dependency). Every admin
route depends on `require_admin`, which verifies the token signature + expiry,
loads the user, and enforces `role == "admin"` and `is_active`. This is real
backend authorization — the frontend role check is purely cosmetic.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User, UserActivity


# --------------------------------------------------------------------------- #
# Password hashing (PBKDF2, stdlib)
# --------------------------------------------------------------------------- #
def hash_password(password: str) -> str:
    salt = hashlib.sha256(settings.AUTH_SECRET.encode()).digest()[:16]
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return dk.hex()


def verify_password(password: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(password), hashed)


# --------------------------------------------------------------------------- #
# Signed tokens
# --------------------------------------------------------------------------- #
def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _sign(payload_b64: str) -> str:
    sig = hmac.new(settings.AUTH_SECRET.encode(), payload_b64.encode(), hashlib.sha256).digest()
    return _b64(sig)


def create_token(user_id: int, role: str) -> str:
    payload = {
        "uid": user_id,
        "role": role,
        "exp": int(time.time()) + settings.AUTH_TOKEN_TTL_HOURS * 3600,
    }
    payload_b64 = _b64(json.dumps(payload, separators=(",", ":")).encode())
    return f"{payload_b64}.{_sign(payload_b64)}"


def decode_token(token: str) -> dict | None:
    try:
        payload_b64, sig = token.split(".", 1)
    except ValueError:
        return None
    if not hmac.compare_digest(sig, _sign(payload_b64)):
        return None
    try:
        payload = json.loads(_unb64(payload_b64))
    except Exception:
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return payload


# --------------------------------------------------------------------------- #
# Dependencies
# --------------------------------------------------------------------------- #
def _bearer(request: Request) -> str | None:
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    return auth.split(" ", 1)[1].strip()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = _bearer(request)
    payload = decode_token(token) if token else None
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = db.get(User, int(payload["uid"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account inactive")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Gate: only active users with role == 'admin' may proceed."""
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


# --------------------------------------------------------------------------- #
# Activity timeline + CRM pipeline helpers
# --------------------------------------------------------------------------- #
def record_activity(db: Session, user_id: int | None, event: str, meta: dict | None = None) -> None:
    """Best-effort activity log (never breaks the calling request)."""
    if user_id is None:
        return
    try:
        db.add(UserActivity(user_id=user_id, event=event, meta=meta or {}))
        db.commit()
    except Exception:
        db.rollback()


# Ordered CRM pipeline stages (a user advances as they use more of the product).
CRM_STAGES = [
    "New User",
    "Assessment Completed",
    "Career Recommended",
    "Resume Optimized",
    "Interview Ready",
    "Job Ready",
]
