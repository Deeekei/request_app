from backend.database import SessionLocal
from backend.models.objects import ObjectsDB
from backend.models.enum import ObjectsEnum


def seed_objects():
    db = SessionLocal()

    # Сопоставление объектов из вашего CSV (Enum-ключ и ID пользователя/заказчика)
    objects_data = [
        (ObjectsEnum.AURIKA, 5),
        (ObjectsEnum.AURUM, 4),
        (ObjectsEnum.MAXIMUS, 6),
        (ObjectsEnum.ADC, 4),
        (ObjectsEnum.LERMONTOV, 4),
        (ObjectsEnum.KPZ, 6),
        (ObjectsEnum.POOL, 6),
        (ObjectsEnum.TOURIST, 6),
        (ObjectsEnum.HELICOPTER, 6),
        (ObjectsEnum.SHOR, 6),
        (ObjectsEnum.KULTUR, 6),
        (ObjectsEnum.UFADOBRAYA, 6),
        (ObjectsEnum.SVOBODA, 5),
        (ObjectsEnum.CENTER, 5),
        (ObjectsEnum.MIHAILOVKA, 5),
        (ObjectsEnum.PPT, 10),
        (ObjectsEnum.MOLOCHNOE, 10),
        (ObjectsEnum.EVPATORIA, 10),
        (ObjectsEnum.ATAEVKA, 10),
        (ObjectsEnum.BAZILEEVKA, 10),
    ]

    added_count = 0

    for enum_val, customer_id in objects_data:
        # Проверяем, чтобы случайно не добавить дубликаты при повторном запуске
        exists = db.query(ObjectsDB).filter(ObjectsDB.name == enum_val).first()
        if not exists:
            new_object = ObjectsDB(name=enum_val, customer_id=customer_id)
            db.add(new_object)
            added_count += 1

    db.commit()
    db.close()
    print(f"Готово! Добавлено новых объектов: {added_count}")


if __name__ == "__main__":
    seed_objects()