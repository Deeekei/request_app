from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from backend.repositories.agreement_material import AgreementMaterialRepository
from backend.models.request import RequestDB, RequestMaterial
from backend.models.enum import OrderStatusEnum, UserRoleEnum, ObjectsEnum
from backend.models.comment import CommentDB
from backend.models.user import UserDB
from backend.schemas.request_models import CommentCreate
from backend.schemas.auth_models import User
from fastapi import HTTPException
from backend.schemas.request_models import RequestCreate
from backend.schemas.request_materials import RequestMaterialCreate
from backend.models.agreement import AgreementMaterial


class RequestRepository:

    def __init__(self, db: Session):
        self.db = db

    # ---------------------------------------------------
    # CREATE
    # ---------------------------------------------------
    def create_draft(self, data: RequestCreate, user: User) -> RequestDB:
        request = RequestDB(
            title=data.title,
            description=data.description,
            object = data.object,
            agreement = data.agreement,
            author_id=user.id,
            author_name=user.full_name,
            status=OrderStatusEnum.DRAFT,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        self.db.add(request)
        self.db.flush()

        for item in data.request_materials:
            agreement_material = (self.db.query(AgreementMaterial)
                                  .filter(AgreementMaterial.id == item.agreement_material_id).first())
            if not agreement_material:
                raise ValueError(f"Материал с id={item.agreement_material_id} не найден")

            if agreement_material.object != data.object:
                raise ValueError(
                    f"Материал id={item.agreement_material_id} не относится к объекту {data.object}"
                )
            available_quantity = (
                    agreement_material.total_quantity
                    - agreement_material.reserved_quantity
                    - agreement_material.spent_quantity
            )
            will_overdraft = item.quantity > available_quantity
            self.db.add(RequestMaterial(
                request_id =request.id,
                overdraft = will_overdraft,
                agreement_material_id=item.agreement_material_id,
                quantity=item.quantity,
            ))
        self.db.flush()

        return request

    # ---------------------------------------------------
    # READ
    # ---------------------------------------------------
    def get_by_id(self, request_id: int) -> Optional[RequestDB]:
        return (
            self.db.query(RequestDB)
            .options(
                selectinload(RequestDB.materials).selectinload(RequestMaterial.agreement_material),
                selectinload(RequestDB.comments),
            )
            .filter(RequestDB.id == request_id)
            .first()
        )

    def get_by_id_for_update(self, request_id: int) -> Optional[RequestDB]:
        return (
            self.db.query(RequestDB)
            .options(
                selectinload(RequestDB.materials).selectinload(RequestMaterial.agreement_material),
                selectinload(RequestDB.comments),
            )
            .filter(RequestDB.id == request_id)
            .with_for_update()
            .first()
        )

    def list_requests(
        self,
        status: Optional[OrderStatusEnum] = None,
        author_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[RequestDB]:
        query = self.db.query(RequestDB).options(
            selectinload(RequestDB.materials).selectinload(RequestMaterial.agreement_material),
            selectinload(RequestDB.comments),
        )

        if status is not None:
            query = query.filter(RequestDB.status == status)

        if author_id is not None:
            query = query.filter(RequestDB.author_id == author_id)

        return (
            query.order_by(RequestDB.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )



    # ---------------------------------------------------
    # UPDATE
    # ---------------------------------------------------
    def update_draft_fields(
            self,
            request: RequestDB,
            title: str | None = None,
            description: str | None = None,
            agreement: str | None = None,
            object: ObjectsEnum | None = None,
    ) -> None:
        if title is not None:
            request.title = title
        if description is not None:
            request.description = description
        if agreement is not None:
            request.agreement = agreement
        if object is not None:
            request.object = object

        request.updated_at = datetime.now(timezone.utc)

    def update_request_status(
        self,
        request_id: int,
        new_status: OrderStatusEnum,
        responsible_role: Optional[str] = None
    ) -> Optional[RequestDB]:
        request = self.get_by_id_for_update(request_id)
        if not request:
            return None

        request.status = new_status
        request.current_responsible = responsible_role
        request.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(request)
        return request

    def replace_materials(
            self,
            request: RequestDB,
            materials: list[RequestMaterialCreate],
    ) -> None:
        existing_by_agreement_material_id = {
            m.agreement_material_id: m for m in request.materials
        }
        incoming_ids = set()

        for item in materials:
            incoming_ids.add(item.agreement_material_id)

            agreement_material = (
                self.db.query(AgreementMaterial)
                .filter(AgreementMaterial.id == item.agreement_material_id)
                .first()
            )

            if not agreement_material:
                raise HTTPException(
                    status_code=404,
                    detail=f"Материал с id={item.agreement_material_id} не найден"
                )

            if agreement_material.object != request.object:
                raise HTTPException(
                    status_code=400,
                    detail=f"Материал '{agreement_material.name}' не относится к объекту заявки"
                )

            available_quantity = (
                    float(agreement_material.total_quantity or 0)
                    - float(agreement_material.reserved_quantity or 0)
                    - float(agreement_material.spent_quantity or 0)
            )

            requested_quantity = float(item.quantity or 0)
            will_overdraft = requested_quantity > available_quantity

            existing = existing_by_agreement_material_id.get(item.agreement_material_id)
            if existing:
                existing.quantity = item.quantity
                existing.overdraft = will_overdraft
            else:
                self.db.add(
                    RequestMaterial(
                        request_id=request.id,
                        agreement_material_id=item.agreement_material_id,
                        quantity=item.quantity,
                        overdraft=will_overdraft,
                    )
                )

        for db_item in list(request.materials):
            if db_item.agreement_material_id not in incoming_ids:
                self.db.delete(db_item)

        request.updated_at = datetime.now(timezone.utc)

    def set_status(
            self,
            request: RequestDB,
            new_status: OrderStatusEnum,
            responsible_role: UserRoleEnum | None,
    ) -> None:
        request.status = new_status
        request.current_responsible = responsible_role
        request.updated_at = datetime.now(timezone.utc)

    # ---------------------------------------------------
    # DELETE
    # ---------------------------------------------------
    def delete(self, request: RequestDB) -> None:
        self.db.delete(request)

    # ---------------------------------------------------
    # COMMENTS
    # ---------------------------------------------------
    def add_comment(
        self,
        request: RequestDB,
        user_id: int,
        user_name: str,
        body: str,
    ) -> CommentDB:
        comment = CommentDB(
            request_id=request.id,
            user_id=user_id,
            user_name=user_name,
            body=body,
        )
        self.db.add(comment)
        request.updated_at = datetime.now(timezone.utc)
        return comment

    def get_comments(self, request_id: int):
        return (
            self.db.query(CommentDB)
            .filter(CommentDB.request_id == request_id)
            .order_by(CommentDB.created_at.asc())
            .all()
        )
    # ---------------------------------------------------
    # MATERIALS
    # ---------------------------------------------------
    def add_materials(
        self,
        request_id: int,
        materials: list
    ):
        request = self.get_for_update(request_id)
        if not request:
            raise ValueError("Заявка не найдена")

        objects = [
            RequestMaterial(
                request_id=request_id,
                agreement_material_id=m["material_id"],
                quantity=m["quantity"]
            )
            for m in materials
        ]

        self.db.add_all(objects)
        self.db.commit()
        for obj in objects:
            self.db.refresh(obj)