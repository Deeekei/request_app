from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ObjectEnum(str, Enum):
    AURIKA = 'ЖК "Аурика"'
    AURUM = 'ЖК "Аурум"'
    MAXIMUS = 'ЖК "Максимус"'
    ADC = 'Административно-деловой центр'
    LERMONTOV = 'Жилой дом в г. Лермонтов'
    KPZ = 'Комплекс производственных зданий в д. Карпово'
    POOL = 'Фитнесс-центр с бассейном в ЖК Старый Центр'
    TOURIST = 'Туристический центр по ул. Менделеева'
    HELICOPTER = 'Вертолетный центр (Хелипорт)'
    SHOR = 'МБУ ДО СШОР №33'
    KULTUR = 'Объект культурного наследия по ул. М. Карима, 3'
    UFADOBRAYA = 'Приют человека'
    SVOBODA = 'ЖК "Свобода"'
    CENTER = 'ЖК "Старый центр"'
    MIHAILOVKA = 'Комплекс МКД с.Михайловка'
    PPT = 'ППТ квартала по ул. Менделеева '
    MOLOCHNOE = 'Комплекс МКД в с. Молочное'
    EVPATORIA = 'Апартаменты в г. Евпатория'
    ATAEVKA = 'КРТ Д.Атаевка'
    BAZILEEVKA = 'КРТ п. Базилевка,'

class MaterialBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    unit: str = Field(..., max_length=10)
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




