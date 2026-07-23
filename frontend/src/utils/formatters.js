export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU');
}

const ENUM_LABELS = {
  AURIKA: 'ЖК "Аурика"',
  AURUM: 'ЖК "Аурум"',
  MAXIMUS: 'ЖК "Максимус"',
  ADC: 'Административно-деловой центр',
  LERMONTOV: 'Жилой дом в г. Лермонтов',
  KPZ: 'Комплекс производственных зданий в д. Карпово',
  POOL: 'Фитнесс-центр с бассейном в ЖК Старый Центр',
  TOURIST: 'Туристический центр по ул. Менделеева',
  HELICOPTER: 'Вертолетный центр (Хелипорт)',
  SHOR: 'МБУ ДО СШОР №33',
  KULTUR: 'Объект культурного наследия по ул. М. Карима, 3',
  UFADOBRAYA: 'Приют человека',
  SVOBODA: 'ЖК "Свобода"',
  CENTER: 'ЖК "Старый центр"',
  MIHAILOVKA: 'Комплекс МКД с.Михайловка',
  PPT: 'ППТ квартала по ул. Менделеева',
  MOLOCHNOE: 'Комплекс МКД в с. Молочное',
  EVPATORIA: 'Апартаменты в г. Евпатория',
  ATAEVKA: 'КРТ Д.Атаевка',
  BAZILEEVKA: 'КРТ п. Базилевка',
  ASB: 'Склад АСБ',
  BGS: 'Склад БГС',

  PAID: 'Оплачено',
  UNPAID: 'Неоплачено',

  DAVALCHESKIE: 'Давальческие',
  SOBSTVENNYE: 'Собственные',
  HOZYAISTVENNYE: 'Хозяйственные',

  REQUEST_FILE: 'Файл заявки',
  INVOICE: 'Счёт',

  аурика: 'ЖК "Аурика"',
  аурум: 'ЖК "Аурум"',
  максимус: 'ЖК "Максимус"',
};

export function normalizeEnum(value) {
  if (!value) return '—';
  const raw = typeof value === 'object' && 'value' in value ? value.value : String(value);
  return ENUM_LABELS[raw] || raw;
}

export function formatStatus(value) {
  let text = normalizeEnum(value);
  if (!text || text === '—') return text;
  text = text
    .replace(/заказчиком/gi, 'Руководителем проекта')
    .replace(/заказчик/gi, 'Руководитель проекта');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function statusTone(status) {
  const normalized = normalizeEnum(status).toLowerCase();
  if (normalized.includes('черновик')) return 'draft';
  if (normalized.includes('проверка')) return 'pending';
  if (normalized.includes('согласовано')) return 'approved';
  if (normalized.includes('отклонено')) return 'rejected';
  return 'neutral';
}

export function normalizeRole(value) {
  return normalizeEnum(value).toLowerCase();
}
