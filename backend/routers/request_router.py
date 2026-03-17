from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime, timezone
from backend.schemas.request_models import Request, OrderStatus, UserRole, RequestCreate, RequestUpdate
from backend.schemas.request_models import Comment
from backend.schemas.auth_models import User, UserRole
from backend.routers.auth_router import get_current_user
from backend.routers.auth_router import get_current_user, require_pto, require_director, require_customer
from backend.schemas.request_models import CommentCreate
from backend.models.request import RequestDB
from backend.models.user import UserDB
from backend.models.comment import CommentDB
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import UserRoleEnum, OrderStatusEnum
from backend.repositories.request_repository import RequestRepository

router = APIRouter(prefix="/requests", tags=["Заявки"])

def add_comment_to_request(request_id, user, comment_text: str, db: Session):
    request = db.query(RequestDB).filter(RequestDB.id == request_id).first()
    if not request:
        raise ValueError(f"Заявка с ID {request_id} не найдена")
    comment = CommentDB(
        user_id=user.id,
        user_name=user.full_name,
        body=comment_text,
        request_id=request_id
    )
    request.updated_at = datetime.now(timezone.utc)
    try:
        db.add(comment)
        db.commit()
        db.refresh(comment)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении комментария {str(e)}")
    return comment

#Эндпоинты для составления заявки, получения всех заявок и отправки заявки на согласование
@router.post("", response_model=Request, status_code=status.HTTP_201_CREATED)
async def create_request(request_data: RequestCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRoleEnum.USER and current_user.role != UserRoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Только пользователь может создавать заявки")
    repo = RequestRepository(db)
    try:
        db_request = repo.create_request(request_data, current_user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при сохранении заявки"
        )
    response_request = Request(
        id=db_request.id,
        title=db_request.title,
        description=db_request.description,
        agreement=db_request.agreement,
        request_materials=db_request.request_materials,
        author_id=db_request.author_id,
        author_name=db_request.author_name,
        status=OrderStatus(db_request.status.value),  # конвертируем строку в Enum
        current_responsible=None,
        comments=[],  # новые заявки без комментариев
        created_at=db_request.created_at,
        updated_at=db_request.updated_at
    )

    return response_request

@router.get("", response_model=List[Request])
async def get_requests(status: Optional[OrderStatusEnum] = None, user_id : Optional[int] = None, skip: int = 0,
    limit: int = 100, db: Session = Depends(get_db)):
    repo = RequestRepository(db)

    status_str = status.name if status else None
    db_requests = repo.get_all(
        status=status_str,
        author_id=user_id,
        skip=skip,
        limit=limit
    )
    return [Request.model_validate(req,from_attributes=True) for req in db_requests]

@router.get("/{request_id}", response_model=Request)
async def get_request(request_id: int, db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    db_request = repo.get_request(request_id)

    if not db_request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return  Request.model_validate(db_request, from_attributes=True)

@router.post("/{request_id}/submit")
async def submit_request(request_id: int, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    request = repo.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if current_user.id != request.author_id:
        raise HTTPException(status_code=403, detail="Только автор может изменять заявку")
    if request.status != OrderStatusEnum.DRAFT:
        raise HTTPException(status_code=400, detail=f"Нельзя отправить заявку в статусе {request.status}")
    updated = repo.update_request_status(
        request_id,
        new_status=OrderStatusEnum.PTO_CHECK.name,
        responsible_role=UserRoleEnum.PTO.name
    )
    comment_text = "Заявка отправлена ПТО генподрядчика на согласование"
    repo.add_comment_text(request.id, current_user, comment_text)
    return {"message": "Заявка отправлена ПТО генподрядчика на согласование", "request": updated}

@router.post("/{request_id}/comments")
async def add_comment(request_id: int, comment: CommentCreate, current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    request = repo.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    try:
        new_comment = repo.add_comment_text(
            request_id=request_id,
            user=current_user,
            comment_text=comment.body
        )
        return Comment.model_validate(new_comment, from_attributes=True)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{request_id}/history")
async def get_request_history(request_id: int, db: Session = Depends(get_db)):
    """Получение истории комментариев заявки"""
    repo = RequestRepository(db)
    request = repo.get_request(request_id)
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
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in comments
        ]
    }

#Эндпоинты для согласования завки ПТО генподрядчика и получения списка заявок на согласовании

@router.post("/{request_id}/pto_check")
async def pto_check(request_id: int, approve: bool, current_user: UserDB = Depends(require_pto), comment: Optional[str] = None, db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    request = repo.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if request.status != OrderStatusEnum.PTO_CHECK:
        raise HTTPException(status_code=400,
                            detail=f"Заявка не на проверке ПТО (текущий статус:{request.status})")
    if approve:
        new_status = OrderStatusEnum.DIRECTOR_CHECK
        new_responsible = UserRoleEnum.DIRECTOR
        message = "Заявка одобрена ПТО Генподрядчика и направлена Директору Генподрядчика"
        comment_text = comment or "Заявка одобрена ПТО"
    else:
        new_status = OrderStatusEnum.REJECTED
        new_responsible = None
        message = "Заявка отклонена ПТО"
        comment_text = comment or "Заявка отклонена ПТО"
    updated = repo.update_request_status(
        request_id,
        new_status=new_status.name,
        responsible_role=new_responsible.name if new_responsible else None
    )
    repo.add_comment_text(request.id, current_user, comment_text)
    return {"message": message, "request": Request.model_validate(updated, from_attributes=True)}

@router.get("/pto/pending")
async def get_pto_pending(current_user: UserDB = Depends(require_pto), db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    pending_requests = repo.get_pending_for_role(OrderStatusEnum.PTO_CHECK.name)
    return {
        "count":len(pending_requests),
        "requests": [Request.model_validate(req, from_attributes=True) for req in pending_requests]
    }

#Эндпоинты для согласования директором ПТО и получения списка заявок

@router.post("/{request_id}/director_check")
async def director_check(request_id: int,
                         approve: bool,
                        current_user: UserDB = Depends(require_director),
                         comment: Optional[str] = None, db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    request = repo.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if request.status != OrderStatusEnum.DIRECTOR_CHECK:
        raise HTTPException(status_code=400, detail=f"Заявка не на утверждении деректором ПТО, текуший статус{request.status}")
    if approve:
        new_status = OrderStatusEnum.CUSTOMER_CHECK
        new_responsible = UserRoleEnum.CUSTOMER
        message = "Заявка утверждена директором ПТО"
        comment_text = comment or "Заявка утверждена директором ПТО"
    else:
        new_status = OrderStatusEnum.REJECTED
        new_responsible = None
        message = "Заявка отклонена директором ПТО"
        comment_text = comment or "Заявка отклонена директором ПТО"
    repo.add_comment_text(request.id, current_user, comment_text)
    updated = repo.update_request_status(
        request_id,
        new_status=new_status.name,
        responsible_role=new_responsible.name if new_responsible else None
    )
    return {"message": message, "request": Request.model_validate(updated, from_attributes=True)}

@router.get("/director/pending/")
async def get_director_pending(current_user: UserDB = Depends(require_director), db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    pending_requests = repo.get_pending_for_role(OrderStatusEnum.DIRECTOR_CHECK.name)
    return {
        "count":len(pending_requests),
        "requests": [Request.model_validate(req, from_attributes=True) for req in pending_requests]
    }

#Эндпоинты для согласования заявки Заказчиком и просмотр списка заявок

@router.post("/{request_id}/customer_check")
async def customer_check(request_id: int,
                         approve: bool,
                        current_user: UserDB = Depends(require_customer),
                         comment: Optional[str] = None, db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    request = repo.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if request.status != OrderStatusEnum.CUSTOMER_CHECK:
        raise HTTPException(status_code=400, detail=f"Заявка не на утверждении заказчиком, текуший статус{request.status}")
    if approve:
        new_status = OrderStatusEnum.APPROVED
        new_responsible = None
        message = "Заявка утверждена заказчиком"
        comment_text = comment or "Заявка утверждена заказчиком"
    else:
        new_status = OrderStatusEnum.REJECTED
        new_responsible = None
        message = "Заявка отклонена заказчиком"
        comment_text = comment or "Заявка отклонена заказчиком"
    updated = repo.update_request_status(
        request_id,
        new_status=new_status.name,
        responsible_role=None
    )
    repo.add_comment_text(request.id, current_user, comment_text)
    return {"message": message, "request": Request.model_validate(updated, from_attributes=True)}

@router.get("/customer/pending/")
async def get_customer_pending(current_user: UserDB = Depends(require_customer), db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    pending_requests = repo.get_pending_for_role(OrderStatusEnum.CUSTOMER_CHECK.name)
    return {
        "count":len(pending_requests),
        "requests": [Request.model_validate(req, from_attributes=True) for req in pending_requests]
    }

#Эндпоинты для редактирования заявки

@router.put("/{request_id}")
async def update_request(request_id: int, update_data:RequestUpdate, current_user: UserDB = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    request = repo.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if current_user.id != request.author_id:
        raise HTTPException(status_code=403, detail="Только автор может редактировать заявку")
    if request.status != OrderStatusEnum.DRAFT:
        raise HTTPException(status_code=400, detail="Нельзя редактировать заявку не в статусе черновик")
    update_data = update_data.model_dump(exclude_unset=True)
    try:
        updated = repo.update(request_id, **update_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при сохранении: {str(e)}"
        )
    return Request.model_validate(updated, from_attributes=True)

@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_request(request_id: int, current_user: User = Depends(get_current_user),db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    request = repo.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if current_user.id != request.author_id:
        raise HTTPException(status_code=403, detail="Только автор может удалить заявку")
    if request.status != OrderStatusEnum.DRAFT:
        raise HTTPException(status_code=400, detail="Можно удалить только черновик")
    try:
        repo.delete(request_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении заявки: {str(e)}"
        )
    return None

#Эндпоинты для добавления материалов

@router.post("/{request_id}/materials")
async def add_materials(request_id: int,
                        materials: listё,
                        current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    repo = RequestRepository(db)
    request = repo.get_request(request_id)

    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if current_user.id != request.author_id:
        raise HTTPException(status_code=403, detail="Только автор может добавлять материалы")

    if request.status != OrderStatusEnum.DRAFT:
        raise HTTPException(status_code=400, detail="Добавлять материалы можно только в черновик")

    try:
        repo.add_materials(request_id, materials)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Материалы добавлены"}