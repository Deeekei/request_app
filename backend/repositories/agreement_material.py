from backend.models.agreement import AgreementMaterial
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

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
        try:
            material = self.get_for_update(material_id)

            material.reserved_quantity = (material.reserved_quantity or 0) + quantity
            material.overdraft = material.available_quantity < 0
            return material

        except SQLAlchemyError:
            self.db.rollback()
            raise

    def unreserve(self, material_id: int, quantity: float):
        try:
            material = self.get_for_update(material_id)

            if (material.reserved_quantity or 0) < quantity:
                raise ValueError("Невозможно снять резерв")

            material.reserved_quantity -= quantity
            material.overdraft = material.available_quantity < 0

            return material

        except SQLAlchemyError:
            self.db.rollback()
            raise

    def spend(self, material_id: int, quantity: float):
        try:
            material = self.get_for_update(material_id)

            if (material.reserved_quantity or 0) < quantity:
                raise ValueError("Недостаточно зарезервированного количества")

            material.reserved_quantity -= quantity
            material.spent_quantity = (material.spent_quantity or 0) + quantity

            material.overdraft = material.available_quantity < 0


            return material

        except SQLAlchemyError:
            self.db.rollback()
            raise
