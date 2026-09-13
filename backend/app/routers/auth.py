"""Authentication router — email/password login that resolves the user's role.

MVP rules (see the product spec):
  * The configured admin email + password -> ensure role='admin' + redirect /admin.
  * Any other existing user -> normal session (role='user').
The issued token is HMAC-signed and required (Bearer) by every admin route.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import User
from ..schemas import AuthResponse, LoginRequest
from ..security import create_token, record_activity
from ..services import ensure_admin_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = payload.email.strip().lower()

    # ---- admin path: exact configured credentials ----
    if email == settings.ADMIN_EMAIL.strip().lower():
        if payload.password != settings.ADMIN_PASSWORD:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        user = ensure_admin_user(db, email)
    else:
        # ---- normal user: must already exist (created via onboarding) ----
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No account for that email — use Get Started to onboard.",
            )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")

    user.last_login = func.now()
    db.commit()
    db.refresh(user)
    record_activity(db, user.id, "login", {"role": user.role})

    return AuthResponse(token=create_token(user.id, user.role), user=user)
