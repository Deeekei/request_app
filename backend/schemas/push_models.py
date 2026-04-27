from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    expirationTime: int | None = None
    keys: PushKeys
    device_label: Optional[str] = None


class PushSubscriptionRead(BaseModel):
    id: int
    endpoint: str
    device_label: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PushPublicKeyResponse(BaseModel):
    public_key: str


class PushTestRequest(BaseModel):
    title: str = "Тестовое уведомление"
    body: str = "Если ты видишь это сообщение — push работает."
    url: str = "/profile"


class PushBroadcastPayload(BaseModel):
    title: str
    body: str
    url: str = "/"
    tag: Optional[str] = None