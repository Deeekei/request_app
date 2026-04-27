import json
import os
from typing import Iterable, Optional
from urllib.parse import urlparse

from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

from backend.models.push_subscription import PushSubscriptionDB


VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS_SUB = os.getenv("VAPID_CLAIMS_SUB", "mailto:admin@example.com")


def get_vapid_public_key() -> str:
    return VAPID_PUBLIC_KEY


def make_notification_payload(
    *,
    title: str,
    body: str,
    url: str = "/",
    tag: Optional[str] = None,
    icon: str = "/pwa-192x192.png",
    badge: str = "/pwa-192x192.png",
):
    return {
        "title": title,
        "body": body,
        "url": url,
        "tag": tag,
        "icon": icon,
        "badge": badge,
    }


def _subscription_to_webpush_dict(sub: PushSubscriptionDB) -> dict:
    return {
        "endpoint": sub.endpoint,
        "keys": {
            "p256dh": sub.p256dh,
            "auth": sub.auth,
        },
    }


def _get_audience_from_endpoint(endpoint: str) -> str:
    parsed = urlparse(endpoint)
    return f"{parsed.scheme}://{parsed.netloc}"


def send_web_push_to_subscription(
    db: Session,
    subscription: PushSubscriptionDB,
    payload: dict,
) -> bool:
    """
    Возвращает True, если отправка успешна.
    Если подписка умерла (404/410), удаляем её из БД и возвращаем False.
    """
    subscription_info = _subscription_to_webpush_dict(subscription)
    audience = _get_audience_from_endpoint(subscription.endpoint)

    try:
        print("PUSH AUDIENCE:", audience)
        print("PUSH CLAIMS:", {
            "sub": VAPID_CLAIMS_SUB,
            "aud": audience,
        })
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": VAPID_CLAIMS_SUB,
                "aud": audience,
            },
        )
        return True
    except WebPushException as exc:
        status_code = None
        if exc.response is not None:
            status_code = exc.response.status_code

        if status_code in (404, 410):
            db.delete(subscription)
            db.commit()
            return False

        raise


def send_push_to_user(
    db: Session,
    user_id: int,
    payload: dict,
) -> int:
    """
    Отправить всем устройствам одного пользователя.
    Возвращает количество успешных отправок.
    """
    subscriptions = (
        db.query(PushSubscriptionDB)
        .filter(PushSubscriptionDB.user_id == user_id)
        .all()
    )

    success_count = 0
    for sub in subscriptions:
        ok = send_web_push_to_subscription(db, sub, payload)
        if ok:
            success_count += 1

    return success_count


def send_push_to_users(
    db: Session,
    user_ids: Iterable[int],
    payload: dict,
) -> int:
    total = 0
    for user_id in set(user_ids):
        total += send_push_to_user(db, user_id, payload)
    return total