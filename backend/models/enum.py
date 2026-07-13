import enum

class OrderStatusEnum(enum.Enum):
    DRAFT = "черновик"
    PTO_CHECK = "проверка ПТО"
    DIRECTOR_CHECK = "проверка директором АСБ"
    CUSTOMER_CHECK = "проверка заказчиком"
    EXECUTOR_CHECK="Передано в снабжение"
    APPROVED = "согласовано"
    REJECTED = "отклонено"
    COMPLETED = "исполнено"

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
    ADC = 'Административно-деловой центр'
    LERMONTOV = 'Жилой дом в г. Лермонтов'
    KPZ = 'Комплекс производственных зданий в д. Карпово'
    POOL = 'Фитнесс-центр с бассейном в ЖК Старый Центр'
    TOURIST = 'Туристический центр по ул. Менделеева'
    HELICOPTER = 'Вертолетный центр (Хелипорт)'
    SHOR = 'МБУ ДО СШОР №33'
    KULTUR = 'Объект культурного наследия по ул. М. Карима, 3'
    UFADOBRAYA = 'Приют человека'
    SVOBODA = 'ЖК "Свобода"'
    CENTER = 'ЖК "Старый центр"'
    MIHAILOVKA = 'Комплекс МКД с.Михайловка'
    PPT = 'ППТ квартала по ул. Менделеева '
    MOLOCHNOE = 'Комплекс МКД в с. Молочное'
    EVPATORIA = 'Апартаменты в г. Евпатория'
    ATAEVKA = 'КРТ Д.Атаевка'
    BAZILEEVKA = 'КРТ п. Базилевка,'


class PaymentStatusEnum(enum.Enum):
    PAID = "Оплачено"
    UNPAID = "Неоплачено"
    ADVANCE = "Аванс 50%"
    DELAY = "В отсрочку"


class RequestTypeEnum(enum.Enum):
    DAVALCHESKIE = "Давальческие"
    SOBSTVENNYE = "Собственные"
    HOZYAISTVENNYE = "Хозяйственные"

class AttachmentTypeEnum(enum.Enum):
    REQUEST_FILE = "REQUEST_FILE"
    INVOICE = "INVOICE"
    UPD = "UPD"

class InvoicePaymentStatusEnum(str, enum.Enum):
    PAID = "оплачено"
    UNPAID = "не оплачено"

# 2. Статус рассмотрения (внутренний процесс)
class InvoiceApprovalStatusEnum(str, enum.Enum):
    UNDER_REVIEW = "на рассмотрении"
    FOR_PAYMENT = "на оплату"