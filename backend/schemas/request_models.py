from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
from backend.models.enum import UserRoleEnum


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
    description: str = Field(..., min_length=10)
    agreement: str = Field(..., min_length=3, max_length=100)
    object: str = Field(..., min_length=3, max_length=100)



class RequestCreate(RequestBase):
    request_materials: List["RequestMaterialCreate"] = Field(
        default_factory=list,
        max_length=100
    )


class RequestUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=10)
    request_materials: Optional[List["RequestMaterialCreate"]] = None


class RequestRead(RequestBase):
    id: int
    author_id: int
    author_name: str
    status: OrderStatus
    current_responsible: Optional[UserRoleEnum]
    materials: List["RequestMaterialRead"] = Field(default_factory=list)
    comments: List[CommentRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)



from .request_materials import RequestMaterialCreate, RequestMaterialRead

RequestCreate.model_rebuild()
RequestUpdate.model_rebuild()
RequestRead.model_rebuild()
