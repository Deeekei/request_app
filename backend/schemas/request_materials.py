from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, List
from datetime import datetime
from backend.schemas.material import UnitEnum
from schemas.request_models import OrderStatus


class RequestMaterialBase(BaseModel):
    material_id: int
    quantity: float = Field(..., gt=0)


class RequestMaterialCreate(RequestMaterialBase):
    pass


class RequestMaterialRead(RequestMaterialBase):
    id: int
    request_id: int
    approved_quantity: Optional[float] = Field(None, ge=0)
    material_name: Optional[str] = None
    material_unit: Optional[UnitEnum] = None
    created_at: datetime

    @model_validator(mode="after")
    def validate_approved_quantity(self):
        if (
            self.approved_quantity is not None
            and self.approved_quantity > self.quantity
        ):
            raise ValueError("approved_quantity cannot exceed requested quantity")
        return self

    model_config = ConfigDict(from_attributes=True)

class RequestMaterial(RequestMaterialBase):
    id: int
    request_id: int
    approved_quantity: Optional[float] = None
    created_at: datetime
    material_name: Optional[str] = None
    material_unit: Optional[UnitEnum] = None

    model_config = ConfigDict(from_attributes=True)

class RequestWithMaterials(BaseModel):
    id: int
    title: str
    description: str
    status: OrderStatus
    author_name: str
    created_at: datetime
    materials: List[RequestMaterial]
    agreement_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)