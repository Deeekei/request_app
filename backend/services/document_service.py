from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side
from pathlib import Path
def generate_request_excel(request):
    wb = Workbook()
    ws = wb.active
    ws.title = "Заявка"

    # === Стили ===
    bold = Font(bold=True)
    center = Alignment(horizontal="center", vertical="center")
    border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )

    # === Шапка ===
    ws["A1"] = "Заявка на материалы"
    ws["A1"].font = Font(bold=True, size=14)

    ws["A3"] = "Номер заявки:"
    ws["B3"] = request.id

    ws["A4"] = "Объект:"
    ws["B4"] = request.object.value

    ws["A5"] = "Договор:"
    ws["B5"] = request.agreement

    ws["A6"] = "Инициатор:"
    ws["B6"] = request.author_name

    ws["A7"] = "Примечания:"
    ws["B7"] = request.description

    ws["A8"] = "Дата создания:"
    ws["B8"] = ws["B8"] = format_excel_datetime(request.created_at)
    # === Заголовок таблицы ===
    start_row = 10

    headers = [
        "№",
        "Материал",
        "Ед. изм.",
        "Количество",
        "Перерасход"
    ]

    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=start_row, column=col, value=header)
        cell.font = bold
        cell.alignment = center
        cell.border = border

    # === Данные ===
    for i, item in enumerate(request.materials, start=1):
        row = start_row + i

        ws.cell(row=row, column=1, value=i).border = border
        ws.cell(row=row, column=2, value=item.agreement_material.name).border = border
        ws.cell(row=row, column=3, value=item.agreement_material.unit).border = border
        ws.cell(row=row, column=4, value=item.quantity).border = border
        ws.cell(row=row, column=5, value="Да" if item.overdraft else "Нет").border = border

    # === Автоширина ===
    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 10
    ws.column_dimensions["D"].width = 15
    ws.column_dimensions["E"].width = 15

    # === Сохранение ===
    output_dir = Path("generated")
    output_dir.mkdir(exist_ok=True)

    file_path = output_dir / f"request_{request.id}.xlsx"
    wb.save(file_path)

    return str(file_path)

def format_excel_datetime(value):
    if value is None:
        return ""
    if value.tzinfo is not None:
        value = value.replace(tzinfo=None)
    return value.strftime("%d.%m.%Y %H:%M")