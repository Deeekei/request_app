from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime, timezone
from typing import Optional
from backend.schemas.request_models import OrderStatus


class AgreementBase(BaseModel):
    number: str = Field(..., min_length=1, max_length=50)
    client_name: str = Field(..., min_length=3, max_length=200)
    start_date:datetime
    end_date:Optional[datetime] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("Конечная дата не может быть раньше начальной")
        return self


class AgreementCreate(AgreementBase):
    pass


class AgreementRead(AgreementBase):
    id: int
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
