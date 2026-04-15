from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UnitEnum(str, Enum):
    PCS = "шт"
    KG = "кг"
    TON = "т"
    M = "м"
    M2 = "м²"
    M3 = "м³"
    L = "л"

class ObjectEnum(str, Enum):
    AURIKA = 'ЖК "Аурика"'
    AURUM = 'ЖК "Аурум"'
    MAXIMUS = 'ЖК "Максимус"'

class MaterialBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    unit: UnitEnum
    total_quantity: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=500)

class MaterialCreate(MaterialBase):
    pass

class Material(MaterialBase):
    id: int
    object: ObjectEnum
    reserved_quantity: float
    spent_quantity: float
    available_quantity: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)




