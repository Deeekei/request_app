from sqlalchemy.orm import Session
from backend.services.push_service import send_push_to_users
from backend.models.enum import OrderStatusEnum, UserRoleEnum, PaymentStatusEnum
from backend.models.user import UserDB
from backend.repositories.request_repository import RequestRepository
from backend.repositories.agreement_material import AgreementMaterialRepository
from backend.schemas.request_models import RequestUpdate, RequestCreate
from datetime import date



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

    def _get_notification_recipients(self, request_obj):
        if request_obj.status == OrderStatusEnum.PTO_CHECK:
            return self.db.query(UserDB).filter(UserDB.role == UserRoleEnum.PTO).all()

        if request_obj.status == OrderStatusEnum.DIRECTOR_CHECK:
            return self.db.query(UserDB).filter(UserDB.role == UserRoleEnum.DIRECTOR).all()

        if request_obj.status == OrderStatusEnum.CUSTOMER_CHECK:
            return self.db.query(UserDB).filter(
                UserDB.role == UserRoleEnum.CUSTOMER,
                UserDB.object == request_obj.object
            ).all()

        if request_obj.status == OrderStatusEnum.APPROVED:
            return self.db.query(UserDB).filter(UserDB.role == UserRoleEnum.EXECUTOR).all()

        return []

    def _notify_next_approvers(self, request_obj):
        recipients = self._get_notification_recipients(request_obj)
        user_ids = [user.id for user in recipients]

        if not user_ids:
            return 0

        try:
            return send_push_to_users(
                db=self.db,
                user_ids=user_ids,
                payload={
                    "title": "Заявка ожидает согласования",
                    "body": f"Заявка №{request_obj.id} по объекту {request_obj.object.value} ожидает вашего согласования",
                    "url": f"/requests/{request_obj.id}"
                }
            )
        except Exception:
            return 0

    def _notify_author(self, request_obj, title: str, body: str):
        try:
            return send_push_to_users(
                db=self.db,
                user_ids=[request_obj.author_id],
                payload={
                    "title": title,
                    "body": body,
                    "url": f"/requests/{request_obj.id}"
                }
            )
        except Exception:
            return 0


    def update_draft(self, request_id: int, data: RequestUpdate, current_user: UserDB):
        request = self.request_repo.get_by_id_for_update(request_id)
        if not request:
            raise ValueError("Заявка не найдена")
        if current_user.id != request.author_id:
            raise PermissionError("Только автор заявки может редактировать заявку")
        if request.status not in [OrderStatusEnum.DRAFT, OrderStatusEnum.REJECTED]:
            raise ValueError("Редактировать можно только черновик или отклоненную заявку")
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
        if request.status not in [OrderStatusEnum.DRAFT, OrderStatusEnum.REJECTED]:
            raise ValueError(f"Нельзя отправить заявку в статусе {request.status.value}")

        try:
            for item in request.materials:
                if not item.is_manual:
                    self.agreement_material_repo.reserve(item.agreement_material_id, item.quantity)

            self.request_repo.set_status(request=request, new_status= OrderStatusEnum.PTO_CHECK,
                                         responsible_role=UserRoleEnum.PTO)
            self.db.commit()
            self.db.refresh(request)
            self._notify_next_approvers(request)
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
                    if not item.is_manual:
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
            if approve:
                self._notify_next_approvers(request)
            else:
                self._notify_author(
                    request,
                    title="Заявка отклонена",
                    body=f"Заявка №{request.id} отклонена ПТО"
                )
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
                    if not item.is_manual:
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
            if approve:
                self._notify_next_approvers(request)
            else:
                self._notify_author(
                    request,
                    title="Заявка отклонена",
                    body=f"Заявка №{request.id} отклонена Директором АСБ"
                )
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
        user_objects = {
            obj.name if hasattr(obj.name, "value") else obj.name
            for obj in current_user.objects
        }
        if request.object not in user_objects:
            raise ValueError("Заявка не по вашему обьекту")
        try:
            if approve:
                self.request_repo.set_status(
                    request=request, new_status=OrderStatusEnum.APPROVED, responsible_role=UserRoleEnum.EXECUTOR
                )

                for item in request.materials:
                    if not item.is_manual:
                        self.agreement_material_repo.spend(item.agreement_material_id, item.quantity)
                body = comment or "Заявка одобрена заказчиком"

            else:
                for item in request.materials:
                    if not item.is_manual:
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
            if approve:
                self._notify_next_approvers(request)
                self._notify_author(
                    request,
                    title="Заявка согласована",
                    body=f"Заявка №{request.id} полностью согласована"
                )
            else:
                self._notify_author(
                    request,
                    title="Заявка отклонена",
                    body=f"Заявка №{request.id} отклонена Руководителем проекта"
                )
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

    def update_payment_status(
        self,
        request_id: int,
        payment_status: PaymentStatusEnum,
        current_user: UserDB,
    ):
        request = self.request_repo.get_by_id(request_id)

        if not request:
            raise ValueError("Заявка не найдена")

        if current_user.role != UserRoleEnum.EXECUTOR:
            raise ValueError("Изменять оплату может только Снабжение")

        if request.status != OrderStatusEnum.APPROVED:
            raise ValueError("Оплату можно менять только у согласованной заявки")

        request.payment_status = payment_status

        body = (
            "Статус оплаты изменён на: Оплачено"
            if payment_status == PaymentStatusEnum.PAID
            else "Статус оплаты изменён на: Неоплачено"
        )

        self.request_repo.add_comment(
            request=request,
            user_id=current_user.id,
            user_name=current_user.full_name,
            body=body,
        )

        self.db.commit()
        self.db.refresh(request)

        return request

    def set_real_delivery_date(self, request_id: int, current_user: UserDB, delivery_date: date):
        request = self.request_repo.get_by_id(request_id)
        if not request:
            raise ValueError("Заявка не найдена")

        if current_user.role != UserRoleEnum.EXECUTOR:
            raise ValueError("Изменять дату поставки может только Снабжение")

        if request.status != OrderStatusEnum.APPROVED:
            raise ValueError("Дату поставки можно менять только у согласованной заявки")

        request.real_delivery_date = delivery_date
        self.db.commit()
        self.db.refresh(request)
        return request