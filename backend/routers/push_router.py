from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.push_subscription import PushSubscriptionDB
from backend.models.user import UserDB
from backend.routers.auth_router import get_current_user
from backend.schemas.push_models import (
    PushSubscriptionIn,
    PushSubscriptionRead,
    PushPublicKeyResponse,
    PushTestRequest,
)
from backend.services.push_service import (
    get_vapid_public_key,
    make_notification_payload,
    send_push_to_user,
)

router = APIRouter(prefix="/push", tags=["Push"])


@router.get("/public-key", response_model=PushPublicKeyResponse)
async def get_push_public_key():
    public_key = get_vapid_public_key()
    if not public_key:
        raise HTTPException(status_code=500, detail="VAPID public key is not configured")
    return PushPublicKeyResponse(public_key=public_key)


@router.get("/me", response_model=list[PushSubscriptionRead])
async def list_my_push_subscriptions(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subs = (
        db.query(PushSubscriptionDB)
        .filter(PushSubscriptionDB.user_id == current_user.id)
        .order_by(PushSubscriptionDB.created_at.desc())
        .all()
    )
    return subs


@router.post("/subscribe", response_model=PushSubscriptionRead)
async def subscribe_push(
    payload: PushSubscriptionIn,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(PushSubscriptionDB)
        .filter(PushSubscriptionDB.endpoint == payload.endpoint)
        .first()
    )

    if existing:
        existing.user_id = current_user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.device_label = payload.device_label
        db.commit()
        db.refresh(existing)
        return existing

    sub = PushSubscriptionDB(
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        device_label=payload.device_label,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.post("/unsubscribe")
async def unsubscribe_push(
    payload: PushSubscriptionIn,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(PushSubscriptionDB)
        .filter(
            PushSubscriptionDB.user_id == current_user.id,
            PushSubscriptionDB.endpoint == payload.endpoint,
        )
        .first()
    )

    if sub:
        db.delete(sub)
        db.commit()

    return {"ok": True}


@router.post("/test")
async def send_test_push(
    payload: PushTestRequest,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sent = send_push_to_user(
        db=db,
        user_id=current_user.id,
        payload=make_notification_payload(
            title=payload.title,
            body=payload.body,
            url=payload.url,
            tag="test-notification",
        ),
    )
    return {"ok": True, "sent": sent}