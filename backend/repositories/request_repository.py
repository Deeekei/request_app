from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from datetime import datetime, timezone

from backend.models.request import RequestDB, RequestMaterial
from backend.models.enum import OrderStatusEnum
from backend.models.comment import CommentDB
from backend.models.user import UserDB
from backend.schemas.request_models import CommentCreate


class RequestRepository:

    def __init__(self, db: Session):
        self.db = db

    # ---------------------------------------------------
    # CREATE
    # ---------------------------------------------------
    def create_request(
        self,
        agreement_id: int,
        title: str,
        description: str,
        author_id: int,
        author_name: str,
        materials: list[dict]
    ) -> RequestDB:

        with self.db.begin():

            request = RequestDB(
                agreement_id=agreement_id,
                title=title,
                description=description,
                author_id=author_id,
                author_name=author_name,
                status=OrderStatusEnum.DRAFT,
                created_at=datetime.now(timezone.utc)
            )

            self.db.add(request)
            self.db.flush()

            for item in materials:
                rm = RequestMaterial(
                    request_id=request.id,
                    agreement_material_id=item["material_id"],
                    quantity=item["quantity"]
                )
                self.db.add(rm)

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

        with self.db.begin():

            request = self.get_for_update(request_id)
            if not request:
                return None

            for key, value in kwargs.items():
                if hasattr(request, key):
                    setattr(request, key, value)

            request.updated_at = datetime.now(timezone.utc)

            return request

    def update_request_status(
        self,
        request_id: int,
        new_status: OrderStatusEnum,
        responsible_role: Optional[str] = None
    ) -> Optional[RequestDB]:

        with self.db.begin():

            request = self.get_for_update(request_id)
            if not request:
                return None

            request.status = new_status
            request.current_responsible = responsible_role
            request.updated_at = datetime.now(timezone.utc)

            return request

    # ---------------------------------------------------
    # DELETE
    # ---------------------------------------------------
    def delete(self, request_id: int) -> bool:

        with self.db.begin():

            request = self.get_for_update(request_id)
            if not request:
                return False

            self.db.delete(request)
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

        with self.db.begin():

            comment = CommentDB(
                body=comment_data.body,
                user_id=user.id,
                user_name=user.full_name,
                request_id=request_id,
                created_at=datetime.now(timezone.utc)
            )

            self.db.add(comment)
            self.db.flush()

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

        with self.db.begin():

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
