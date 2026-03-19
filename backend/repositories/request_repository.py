from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from backend.repositories.agreement_material import AgreementMaterialRepository
from backend.models.request import RequestDB, RequestMaterial
from backend.models.enum import OrderStatusEnum
from backend.models.comment import CommentDB
from backend.models.user import UserDB
from backend.schemas.request_models import CommentCreate
from backend.schemas.auth_models import User

from backend.schemas.request_models import RequestCreate
from backend.schemas.request_materials import RequestMaterialCreate


class RequestRepository:

    def __init__(self, db: Session):
        self.db = db

    # ---------------------------------------------------
    # CREATE
    # ---------------------------------------------------
    def create_request(self, data: RequestCreate, user: User) -> RequestDB:
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

        materials = [
            RequestMaterial(
                request_id=request.id,
                agreement_material_id=m.agreement_material_id,
                quantity=m.quantity,
            )
            for m in data.request_materials
        ]
        self.db.add_all(materials)
        self.db.commit()
        self.db.refresh(request)

        return request

    # ---------------------------------------------------
    # READ
    # ---------------------------------------------------
    def get_request(self, request_id: int) -> Optional[RequestDB]:
        return (
            self.db.query(RequestDB)
            .filter(RequestDB.id == request_id)
            .first()
        )

    def get_for_update(self, request_id: int) -> Optional[RequestDB]:
        return (
            self.db.query(RequestDB)
            .filter(RequestDB.id == request_id)
            .with_for_update()
            .first()
        )

    def get_all(
        self,
        status: Optional[OrderStatusEnum] = None,
        author_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[RequestDB]:

        query = self.db.query(RequestDB)

        if status:
            query = query.filter(RequestDB.status == status)

        if author_id:
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
    def update(self, request_id: int, **kwargs) -> Optional[RequestDB]:
        request = self.get_for_update(request_id)
        if not request:
            return None

        for key, value in kwargs.items():
            if hasattr(request, key):
                setattr(request, key, value)

        request.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(request)

        return request

    def update_request_status(
        self,
        request_id: int,
        new_status: OrderStatusEnum,
        responsible_role: Optional[str] = None
    ) -> Optional[RequestDB]:
        request = self.get_for_update(request_id)
        if not request:
            return None

        request.status = new_status
        request.current_responsible = responsible_role
        request.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(request)
        return request

    # ---------------------------------------------------
    # DELETE
    # ---------------------------------------------------
    def delete(self, request_id: int) -> bool:
        request = self.get_for_update(request_id)
        if not request:
            return False

        self.db.delete(request)
        self.db.commit()
        return True

    # ---------------------------------------------------
    # COMMENTS
    # ---------------------------------------------------
    def add_comment(
        self,
        request_id: int,
        comment_data: CommentCreate,
        user: UserDB
    ) -> CommentDB:
        comment = CommentDB(
            body=comment_data.body,
            user_id=user.id,
            user_name=user.full_name,
            request_id=request_id,
            created_at=datetime.now(timezone.utc)
        )

        self.db.add(comment)
        self.db.flush()
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def add_comment_text(
        self,
        request_id: int,
        user: UserDB,
        comment_text: str
    ) -> CommentDB:

        comment_data = CommentCreate(body=comment_text)
        return self.add_comment(request_id, comment_data, user)

    def get_comments(self, request_id: int) -> List[CommentDB]:
        return (
            self.db.query(CommentDB)
            .filter(CommentDB.request_id == request_id)
            .order_by(CommentDB.created_at)
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