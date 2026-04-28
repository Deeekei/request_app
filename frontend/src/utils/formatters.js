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

export function capitalizeFirst(value) {
  let text = normalizeEnum(value);
  if (!text || text === '—') return text;
  text = text.replace(/заказчиком/gi, 'Руководителем проекта')
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
