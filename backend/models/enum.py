import enum

class OrderStatusEnum(enum.Enum):
    DRAFT = "черновик"
    PTO_CHECK = "проверка ПТО"
    DIRECTOR_CHECK = "проверка директором АСБ"
    CUSTOMER_CHECK = "проверка заказчиком"
    APPROVED = "согласовано"
    REJECTED = "отклонено"

class UserRoleEnum(enum.Enum):
    USER = "пользователь"
    PTO = "ПТО"
    DIRECTOR = "директор"
    CUSTOMER = "заказчик"
    ADMIN = "администратор"

class ObjectsEnum(enum.Enum):
    AURIKA = "аурика"
    AURUM = "аурум"
    MAXIMUS = "максимус"