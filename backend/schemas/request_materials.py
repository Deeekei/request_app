from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, List
from datetime import datetime
from backend.schemas.request_models import OrderStatus


class RequestMaterialBase(BaseModel):
    agreement_material_id: Optional[int] = None
    quantity: float = Field(..., gt=0)


class RequestMaterialCreate(RequestMaterialBase):
    manual_name: Optional[str] = None
    manual_unit: Optional[str] = None
    manual_comment: Optional[str] = None
    is_manual: bool = False

    @model_validator(mode="after")
    def validate_material_source(self):
        if self.is_manual:
            if not self.manual_name or not self.manual_unit:
                raise ValueError("Для ручного материала нужно указать название и единицу измерения")
            if self.agreement_material_id is not None:
                raise ValueError("Для ручного материала нельзя передавать agreement_material_id")
        else:
            if self.agreement_material_id is None:
                raise ValueError("Нужно выбрать материал из договора")
            if self.manual_name or self.manual_unit or self.manual_comment:
                raise ValueError("Для договорного материала нельзя передавать ручные поля")
        return self

class RequestMaterialRead(RequestMaterialBase):
    id: int
    request_id: int
    agreement_material_id: Optional[int] = None
    is_manual: bool = False
    material_name: Optional[str] = None
    material_unit: Optional[str] = None
    manual_comment: Optional[str] = None
    quantity: float
    overdraft: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RequestMaterial(RequestMaterialBase):
    id: int
    request_id: int
    overdraft: bool
    created_at: datetime
    material_name: Optional[str] = None
    material_unit: Optional[str] = None

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
    unit: str
    total_quantity: float
    reserved_quantity: float
    spent_quantity: float
