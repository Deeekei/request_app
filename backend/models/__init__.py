# Этот файл делает папку models пакетом Python
# И позволяет импортировать все модели одной строкой

from backend.models.enum import OrderStatusEnum, UserRoleEnum
from backend.models.user import UserDB
from backend.models.request import RequestDB
from backend.models.comment import CommentDB
from backend.models.push_subscription import PushSubscriptionDB

# Что можно будет писать в других файлах:
# from models import UserDB, RequestDB, CommentDB, OrderStatusEnum