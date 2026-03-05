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
            with self.db.begin():

                material = self.get_for_update(material_id)

                if material.available_quantity < quantity:
                    raise ValueError("Недостаточно доступного количества")

                material.reserved_quantity += quantity

                return material

        except SQLAlchemyError:
            self.db.rollback()
            raise

    def unreserve(self, material_id: int, quantity: float):
        try:
            with self.db.begin():

                material = self.get_for_update(material_id)

                if material.reserved_quantity < quantity:
                    raise ValueError("Невозможно снять резерв")

                material.reserved_quantity -= quantity

                return material

        except SQLAlchemyError:
            self.db.rollback()
            raise

    def spend(self, material_id: int, quantity: float):
        try:
            with self.db.begin():

                material = self.get_for_update(material_id)

                if material.reserved_quantity < quantity:
                    raise ValueError("Недостаточно зарезервированного количества")

                material.reserved_quantity -= quantity
                material.spent_quantity += quantity

                return material

        except SQLAlchemyError:
            self.db.rollback()
            raise