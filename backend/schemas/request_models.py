from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone, date
from enum import Enum
from backend.models.enum import ObjectsEnum, UserRoleEnum, OrderStatusEnum


class OrderStatus(str, Enum):
    DRAFT = "черновик"
    PTO_CHECK = "проверка ПТО"
    DIRECTOR_CHECK = "проверка директором АСБ"
    CUSTOMER_CHECK = "проверка заказчиком"
    APPROVED = "согласовано"
    REJECTED = "отклонено"


class CommentBase(BaseModel):
    body: str = Field(..., min_length=1)


class CommentCreate(CommentBase):
    pass


class CommentRead(CommentBase):
    id: int
    user_id: int
    user_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RequestBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str | None = None
    agreement: str = Field(..., min_length=3)
    section: str = Field(...,max_length=10)
    delivery_date: date
    object: ObjectsEnum



class RequestCreate(RequestBase):
    request_materials: List["RequestMaterialCreate"] = Field(
        default_factory=list,
        max_length=100
    )


class RequestUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=10)
    request_materials: Optional[List["RequestMaterialCreate"]] = None
    section: Optional[str] = Field(None, max_length=10)
    delivery_date: Optional[date] = None


class RequestRead(RequestBase):
    id: int
    author_id: int
    author_name: str
    status: OrderStatusEnum
    current_responsible: Optional[UserRoleEnum]
    section: Optional[str] = Field(None, max_length=10)
    delivery_date: Optional[date] = None
    materials: List["RequestMaterialRead"] = Field(default_factory=list)
    comments: List[CommentRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)



from .request_materials import RequestMaterialCreate, RequestMaterialRead

RequestCreate.model_rebuild()
RequestUpdate.model_rebuild()
RequestRead.model_rebuild()
