from sqlalchemy.orm import Session
from urllib3 import request

from backend.models.enum import OrderStatusEnum, UserRoleEnum
from backend.models.user import UserDB
from backend.repositories.request_repository import RequestRepository
from backend.repositories.agreement_material import AgreementMaterialRepository
from backend.schemas.request_models import RequestUpdate, RequestCreate



class RequestService:
    def __init__(self, db: Session):
        self.db = db
        self.request_repo = RequestRepository(db)
        self.agreement_material_repo = AgreementMaterialRepository(db)

    def create_draft(self, data: RequestCreate, current_user: UserDB):
        if current_user.role not in [UserRoleEnum.USER, UserRoleEnum.ADMIN]:
            raise PermissionError("Только пользователь может создавать заявки")
        try:
            request = (self.request_repo.create_draft(data=data, user = current_user))
            self.db.commit()
            self.db.refresh(request)
            return self.request_repo.get_by_id(request.id)
        except Exception as e:
            self.db.rollback()
            raise


    def update_draft(self, request_id: int, data: RequestUpdate, current_user: UserDB):
        request = self.request_repo.get_by_id_for_update(request_id)
        if not request:
            raise ValueError("Заявка не найдена")
        if current_user.id != request.author_id:
            raise PermissionError("Только автор заявки может редактировать заявку")
        if request.status != OrderStatusEnum.DRAFT:
            raise ValueError("Редактировать можно только черновик")
        try :
            self.request_repo.update_draft_fields(request = request, title=data.title, description=data.description)
            if data.request_materials is not None:
                self.request_repo.replace_materials(request=request, materials=data.request_materials)
            self.db.commit()
            self.db.refresh(request)
            return self.request_repo.get_by_id(request.id)
        except Exception:
            self.db.rollback()
            raise

    def submit(self, request_id: int, current_user: UserDB):
        request = self.request_repo.get_by_id(request_id)
        if not request:
            raise ValueError("Заявка не найдена")
        if current_user.id != request.author_id:
            raise PermissionError("Только автор может отправить заявку")
        if request.status != OrderStatusEnum.DRAFT:
            raise ValueError(f"Нельзя отправить заявку в статусе {request.status.value}")

        try:
            for item in request.materials:
                self.agreement_material_repo.reserve(item.agreement_material_id, item.quantity)

            self.request_repo.set_status(request=request, new_status= OrderStatusEnum.PTO_CHECK,
                                         responsible_role=UserRoleEnum.PTO)
            self.db.commit()
            self.db.refresh(request)
            return self.request_repo.get_by_id(request.id)
        except Exception:
            self.db.rollback()
            raise

    def pto_review(self, request_id: int,approve: bool, current_user: UserDB, comment: str | None = None):
        request = self.request_repo.get_by_id(request_id)
        if not request:
            raise ValueError("Заявка не найдена")
        if request.status != OrderStatusEnum.PTO_CHECK:
            raise ValueError("Заявка не на проверке у ПТО")
        try:
            if approve:
                self.request_repo.set_status(
                    request=request, new_status = OrderStatusEnum.DIRECTOR_CHECK, responsible_role = UserRoleEnum.DIRECTOR
                )
                body = comment or "Заявка одобрена ПТО"

            else:
                for item in request.materials:
                    self.agreement_material_repo.unreserve(item.agreement_material_id, item.quantity)
                self.request_repo.set_status(
                    request=request,
                    new_status=OrderStatusEnum.REJECTED,
                    responsible_role=None,
                )
                body = comment or "Заявка отклонена ПТО"
            self.request_repo.add_comment(
                request=request,
                user_id=current_user.id,
                user_name=current_user.full_name,
                body=body,
            )

            self.db.commit()
            self.db.refresh(request)
            return self.request_repo.get_by_id(request.id)

        except Exception:
            self.db.rollback()
            raise

    def director_review(self, request_id: int, approve: bool, current_user: UserDB, comment: str | None = None):
        request = self.request_repo.get_by_id(request_id)
        if not request:
            raise ValueError("Заявка не найдена")
        if request.status != OrderStatusEnum.DIRECTOR_CHECK:
            raise ValueError("Заявка не на проверке у ПТО")
        try:
            if approve:
                self.request_repo.set_status(
                    request=request, new_status=OrderStatusEnum.CUSTOMER_CHECK, responsible_role=UserRoleEnum.CUSTOMER
                )
                body = comment or "Заявка одобрена Директором АСБ"

            else:
                for item in request.materials:
                    self.agreement_material_repo.unreserve(item.agreement_material_id, item.quantity)
                self.request_repo.set_status(
                    request=request,
                    new_status=OrderStatusEnum.REJECTED,
                    responsible_role=None,
                )
                body = comment or "Заявка отклонена Директором АСБ"
            self.request_repo.add_comment(
                request=request,
                user_id=current_user.id,
                user_name=current_user.full_name,
                body=body,
            )

            self.db.commit()
            self.db.refresh(request)
            return self.request_repo.get_by_id(request.id)

        except Exception:
            self.db.rollback()
            raise

    def customer_review(self, request_id: int, approve: bool, current_user: UserDB, comment: str | None = None):
        request = self.request_repo.get_by_id(request_id)
        if not request:
            raise ValueError("Заявка не найдена")
        if request.status != OrderStatusEnum.CUSTOMER_CHECK:
            raise ValueError("Заявка не на проверке у Заказчика")
        try:
            if approve:
                self.request_repo.set_status(
                    request=request, new_status=OrderStatusEnum.APPROVED, responsible_role=None
                )
                for item in request.materials:
                    self.agreement_material_repo.spend(item.agreement_material_id, item.quantity)
                body = comment or "Заявка одобрена заказчиком"

            else:
                for item in request.materials:
                    self.agreement_material_repo.unreserve(item.agreement_material_id, item.quantity)
                self.request_repo.set_status(
                    request=request,
                    new_status=OrderStatusEnum.REJECTED,
                    responsible_role=None,
                )
                body = comment or "Заявка отклонена заказчиком"
            self.request_repo.add_comment(
                request=request,
                user_id=current_user.id,
                user_name=current_user.full_name,
                body=body,
            )

            self.db.commit()
            self.db.refresh(request)
            return self.request_repo.get_by_id(request.id)

        except Exception:
            self.db.rollback()
            raise


    def delete_draft(self, request_id: int, current_user: UserDB):
        request = self.request_repo.get_by_id_for_update(request_id)
        if not request:
            raise ValueError("Заявка не найдена")

        if current_user.id != request.author_id:
            raise PermissionError("Только автор может удалить заявку")

        if request.status != OrderStatusEnum.DRAFT:
            raise ValueError("Можно удалить только черновик")

        try:
            self.request_repo.delete(request)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
