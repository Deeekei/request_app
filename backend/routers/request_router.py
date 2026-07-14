from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from pydantic import BaseModel
from multipart import file_path
from datetime import date
from backend.schemas.request_models import RequestCreate, RequestUpdate, RequestRead
from backend.schemas.request_models import CommentRead, PaymentStatusUpdate, RequestStatusUpdate
from backend.routers.auth_router import get_current_user, require_pto, require_director, require_customer
from backend.schemas.request_models import CommentCreate
from backend.models.request import RequestDB
from backend.models.user import UserDB
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.enum import OrderStatusEnum
from backend.repositories.request_repository import RequestRepository
from backend.schemas.request_materials import RequestMaterialRead, MaterialRead
from backend.services.request_service import RequestService
from fastapi.responses import FileResponse
from backend.services.document_service import generate_request_excel
from backend.repositories.agreement_material import AgreementMaterialRepository
from backend.schemas.material import ObjectEnum
from backend.routers.auth_router import require_executor



router = APIRouter(prefix="/requests", tags=["Заявки"])

class MaterialResponsibleUpdate(BaseModel):
    responsible: Optional[str] = None

def to_request_read(req) -> RequestRead:
    materials = [
        RequestMaterialRead.model_validate(
            {
                "id": m.id,
                "request_id": m.request_id,
                "agreement_material_id": m.agreement_material_id,
                "is_manual": m.is_manual,
                "quantity": m.quantity,
                "overdraft": m.overdraft,
                "material_name": m.manual_name if m.is_manual else (
                    m.agreement_material.name if m.agreement_material else None
                ),
                "material_unit": m.manual_unit if m.is_manual else (
                    m.agreement_material.unit if m.agreement_material else None
                ),
                "manual_comment": m.manual_comment if m.is_manual else None,
                "created_at": m.created_at,
                "responsible": m.responsible,
            }
        )
        for m in req.materials
    ]

    comments = [
        CommentRead.model_validate(
            {
                "id": c.id,
                "user_id": c.user_id,
                "user_name": c.user_name,
                "body": c.body,
                "created_at": c.created_at,
            }
        )
        for c in req.comments
    ]

    return RequestRead.model_validate(
        {
            "id": req.id,
            "title": req.title,
            "description": req.description,
            "object": req.object,
            "agreement": req.agreement,
            "section": req.section,
            "delivery_date": req.delivery_date,
            "status": req.status,
            "author_id": req.author_id,
            "author_name": req.author_name,
            "current_responsible": req.current_responsible,
            "created_at": req.created_at,
            "updated_at": req.updated_at,
            "materials": materials,
            "comments": comments,
            "payment_status": req.payment_status,
            "request_type": req.request_type,
            "real_delivery_date": req.real_delivery_date
        }
    )
def spend_all_materials(materials: List[RequestMaterialRead], request: RequestDB, db: Session):
    repo = AgreementMaterialRepository(db)
    try:
        for m in materials:
            repo.spend(m.agreement_material_id, m.quantity)

        db.commit()

    except Exception:
        db.rollback()
        raise


#Эндпоинты для составления заявки, получения всех заявок и отправки заявки на согласование
@router.post("", response_model=RequestRead, status_code=status.HTTP_201_CREATED)
async def create_request(request_data: RequestCreate, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    service = RequestService(db)
    try:
        request = service.create_draft(request_data, current_user)
        return to_request_read(request)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        import traceback
        print("\n=== ERROR IN POST /requests ===")
        traceback.print_exc()
        print("Exception repr:", repr(e))
        raise

@router.get("", response_model=List[RequestRead])
async def get_requests(
    status: Optional[OrderStatusEnum] = None,
    user_id: Optional[int] = None,
    object: Optional[ObjectEnum] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    repo = RequestRepository(db)
    requests = repo.list_requests(
        status=status,
        author_id=user_id,
        object_name=object,
        skip=skip,
        limit=limit,
    )
    return [to_request_read(r) for r in requests]

@router.get("/{request_id}", response_model=RequestRead)
async def get_request(
    request_id: int,
    db: Session = Depends(get_db),
):
    repo = RequestRepository(db)
    request = repo.get_by_id(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return to_request_read(request)

@router.post("/{request_id}/submit")
async def submit_request(
    request_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequestService(db)
    try:
        updated = service.submit(request_id, current_user)
        return to_request_read(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка при отправке заявки")


@router.post("/{request_id}/comments")
async def add_comment(
    request_id: int,
    comment: CommentCreate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = RequestRepository(db)
    request = repo.get_by_id(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    try:
        new_comment = repo.add_comment(
            request=request,
            user_id=current_user.id,
            user_name=current_user.full_name,
            body=comment.body,
        )
        db.commit()
        db.refresh(new_comment)
        return CommentRead.model_validate(new_comment, from_attributes=True)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка при добавлении комментария")


@router.get("/{request_id}/history")
async def get_request_history(
    request_id: int,
    db: Session = Depends(get_db),
):
    repo = RequestRepository(db)
    request = repo.get_by_id(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    comments = repo.get_comments(request_id)
    return {
        "request_id": request_id,
        "agreement": request.agreement,
        "total_comments": len(comments),
        "comments": [
            {
                "id": c.id,
                "user_id": c.user_id,
                "user_name": c.user_name,
                "body": c.body,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in comments
        ],
    }

#Эндпоинты для согласования завки ПТО генподрядчика и получения списка заявок на согласовании

@router.post("/{request_id}/pto_check")
async def pto_check(
    request_id: int,
    approve: bool,
    comment: Optional[str] = None,
    current_user: UserDB = Depends(require_pto),
    db: Session = Depends(get_db),
):
    service = RequestService(db)
    try:
        updated = service.pto_review(request_id, approve, current_user, comment)
        return to_request_read(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка при согласовании ПТО")


@router.get("/pto/pending")
async def get_pto_pending(current_user: UserDB = Depends(require_pto), db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    pending_requests = repo.list_requests(OrderStatusEnum.PTO_CHECK)
    return {
        "count":len(pending_requests),
        "requests": [to_request_read(req) for req in pending_requests]
    }

#Эндпоинты для согласования директором ПТО и получения списка заявок

@router.post("/{request_id}/director_check")
async def director_check(
    request_id: int,
    approve: bool,
    comment: Optional[str] = None,
    current_user: UserDB = Depends(require_director),
    db: Session = Depends(get_db),
):
    service = RequestService(db)
    try:
        updated = service.director_review(request_id, approve, current_user, comment)
        return to_request_read(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка при согласовании директором")

@router.get("/director/pending/")
async def get_director_pending(current_user: UserDB = Depends(require_director), db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    pending_requests = repo.list_requests(OrderStatusEnum.DIRECTOR_CHECK)
    return {
        "count":len(pending_requests),
        "requests": [to_request_read(req) for req in pending_requests]
    }

#Эндпоинты для согласования заявки Заказчиком и просмотр списка заявок

@router.post("/{request_id}/customer_check")
async def customer_check(
    request_id: int,
    approve: bool,
    comment: Optional[str] = None,
    current_user: UserDB = Depends(require_customer),
    db: Session = Depends(get_db),
):
    service = RequestService(db)
    try:
        updated = service.customer_review(request_id, approve, current_user, comment)
        return to_request_read(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка при согласовании заказчиком")

@router.get("/customer/pending/")
async def get_customer_pending(current_user: UserDB = Depends(require_customer), db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    pending_requests = repo.list_requests(status=OrderStatusEnum.CUSTOMER_CHECK, user=current_user)
    return {
        "count":len(pending_requests),
        "requests": [to_request_read(req) for req in pending_requests]
    }

#Эндпоинты для редактирования заявки

@router.put("/{request_id}")
async def update_request(
    request_id: int,
    update_data: RequestUpdate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequestService(db)
    try:
        updated = service.update_draft(request_id, update_data, current_user)
        return to_request_read(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка при обновлении заявки")


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_request(
    request_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequestService(db)
    try:
        service.delete_draft(request_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка при удалении заявки")

@router.get("/agreement-materials/{object}", response_model=List[MaterialRead])
async def get_materials(
    object: ObjectEnum,
        db: Session = Depends(get_db)
):
    print(object)
    repo = AgreementMaterialRepository(db)
    list_materials = repo.get_materials(object.name)
    return list_materials


@router.get("/{request_id}/excel")
async def get_exel(
        request_id: int,
        current_user: UserDB = Depends(get_current_user),  # <-- ТЕПЕРЬ ПУСКАЕМ ВСЕХ АВТОРИЗОВАННЫХ
        db: Session = Depends(get_db)
):
    repo = RequestRepository(db)
    request = repo.get_by_id(request_id)

    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    # <-- РАСШИРЯЕМ ДОСТУП: пускаем и согласованные, и исполненные заявки
    if request.status not in [OrderStatusEnum.APPROVED, OrderStatusEnum.COMPLETED]:
        raise HTTPException(status_code=400, detail="Заявка еще не согласована")

    file_path = generate_request_excel(request)

    return FileResponse(
        path=file_path,
        filename=f"Заявка_{request_id}.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@router.patch("/{request_id}/payment-status", response_model=RequestRead)
async def update_payment_status(
    request_id: int,
    payload: PaymentStatusUpdate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
    ):
    service = RequestService(db)
    try:
        return service.update_payment_status(
            request_id=request_id,
            payment_status=payload.payment_status,
            current_user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.patch("/{request_id}/real-delivery-date")
def set_real_delivery_date(
    request_id: int,
    delivery_date: date,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequestService(db)
    try:
        return service.set_real_delivery_date(
            request_id=request_id,
            current_user=current_user,
            delivery_date=delivery_date,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.patch("/{request_id}/status", response_model=RequestRead)
def update_request_status(
        request_id: int,
        payload: RequestStatusUpdate,
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user)
):
    """
    Эндпоинт для точечного изменения статуса заявки
    (например, кнопка 'Исполнено' для исполнителя)
    """
    # Инициализируем ваш сервис/репозиторий (у вас это может выглядеть немного иначе)
    repo = RequestRepository(db)

    # Вызываем функцию, написанную на Шаге 2
    updated_request = repo.update_status(
        request_id=request_id,
        new_status=payload.status,
        current_user=current_user
    )

    return updated_request


@router.patch("/{request_id}/materials/{material_id}/responsible")
def update_material_responsible(
        request_id: int,
        material_id: int,
        payload: MaterialResponsibleUpdate,
        current_user: UserDB = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # НОВОЕ: Проверка роли пользователя
    allowed_roles = ["снабжение", "администратор", "admin", "procurement", "ADMIN", "EXECUTOR"]
    if str(current_user.role).lower() not in allowed_roles:
        raise HTTPException(status_code=403, detail="Только снабжение или администратор могут назначать ответственных")

    from backend.models.request import RequestMaterialDB

    mat = db.query(RequestMaterialDB).filter(
        RequestMaterialDB.id == material_id,
        RequestMaterialDB.request_id == request_id
    ).first()

    if not mat:
        raise HTTPException(status_code=404, detail="Материал не найден")

    mat.responsible = payload.responsible
    db.commit()
    return {"status": "ok"}