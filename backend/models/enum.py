import enum

class OrderStatusEnum(enum.Enum):
    DRAFT = "черновик"
    PTO_CHECK = "проверка ПТО"
    DIRECTOR_CHECK = "проверка директором АСБ"
    CUSTOMER_CHECK = "проверка заказчиком"
    EXECUTOR_CHECK="Передано в снабжение"
    APPROVED = "согласовано"
    REJECTED = "отклонено"

class UserRoleEnum(enum.Enum):
    USER = "Пользователь"
    PTO = "ПТО"
    DIRECTOR = "Директор"
    CUSTOMER = "Заказчик"
    ADMIN = "Администратор"
    EXECUTOR = "Снабжение"

class ObjectsEnum(enum.Enum):
    AURIKA = 'ЖК "Аурика"'
    AURUM = 'ЖК "Аурум"'
    MAXIMUS = 'ЖК "Максимус"'