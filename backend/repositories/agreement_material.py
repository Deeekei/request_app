from backend.models.agreement import AgreementMaterial
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from backend.models.enum import ObjectsEnum


class AgreementMaterialRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_for_update(self, material_id: int) -> AgreementMaterial:
        material = (
            self.db.query(AgreementMaterial)
            .filter(AgreementMaterial.id == material_id)
            .with_for_update()
            .first()
        )
        if not material:
            raise ValueError("Материал не найден")

        return material

    def reserve(self, material_id: int, quantity: float):
            material = self.get_for_update(material_id)

            material.reserved_quantity = (material.reserved_quantity or 0) + quantity
            material.overdraft = material.available_quantity < 0
            return material


    def unreserve(self, material_id: int, quantity: float):
            material = self.get_for_update(material_id)

            if (material.reserved_quantity or 0) < quantity:
                raise ValueError("Невозможно снять резерв")

            material.reserved_quantity -= quantity
            material.overdraft = material.available_quantity < 0

            return material


    def spend(self, material_id: int, quantity: float):
            material = self.get_for_update(material_id)

            if (material.reserved_quantity or 0) < quantity:
                raise ValueError("Недостаточно зарезервированного количества")

            material.reserved_quantity -= quantity
            material.spent_quantity = (material.spent_quantity or 0) + quantity

            material.overdraft = material.available_quantity < 0


            return material

    def get_materials(self, object: ObjectsEnum):
        materials = (
            self.db.query(AgreementMaterial).filter(AgreementMaterial.object == object).all()
        )
        return [{"id": m.id,
                 "name": m.name,
                 "unit": m.unit,
                 "total_quantity": m.total_quantity,
                 "reserved_quantity": m.reserved_quantity,
                 "spent_quantity": m.spent_quantity} for m in materials]


