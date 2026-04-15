from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, List
from datetime import datetime
from backend.schemas.material import UnitEnum
from backend.schemas.request_models import OrderStatus


class RequestMaterialBase(BaseModel):
    agreement_material_id: int
    quantity: float = Field(..., gt=0)


class RequestMaterialCreate(RequestMaterialBase):
    pass


class RequestMaterialRead(RequestMaterialBase):
    id: int
    request_id: int
    overdraft: bool
    material_name: Optional[str] = None
    material_unit: Optional[UnitEnum] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RequestMaterial(RequestMaterialBase):
    id: int
    request_id: int
    overdraft: bool
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

class MaterialRead(BaseModel):
    id: int
    name: str
    unit: UnitEnum
    total_quantity: float
    reserved_quantity: float
    spent_quantity: float
