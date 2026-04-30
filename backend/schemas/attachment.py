from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AttachmentRead(BaseModel):
    id: int
    request_id: int
    original_name: str
    content_type: str | None = None
    size_bytes: int
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)