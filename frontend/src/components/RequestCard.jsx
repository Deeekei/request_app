import { Link } from 'react-router-dom';
import { formatDateTime, formatStatus, normalizeEnum, statusTone } from '../utils/formatters';

export function RequestCard({ request }) {
  const isDraft = normalizeEnum(request.status).toLowerCase() === 'черновик';
  const materialResponsibles = Array.from(
    new Set((request?.materials || []).map((m) => m.responsible).filter(Boolean))
  ).join(', ');
  // Функция для определения цвета статуса оплаты
  const getPaymentStatusTone = (status) => {
    const val = normalizeEnum(status);
    if (val === 'Оплачено') return 'approved';
    if (val === 'Неоплачено') return 'rejected';
    if (val === 'Аванс 50%' || val === 'В отсрочку') return 'warning';
    return 'neutral';
  };

  return (
    <article className="request-card">
      <div className="request-card__header">
        <div>
          <h3>{request.title}</h3>
          <div className="meta-line wrap">
            <span className={`pill ${statusTone(request.status)}`}>{formatStatus(request.status)}</span>

            {/* Вывод статуса оплаты цветом */}
            <span className={`pill ${getPaymentStatusTone(request.payment_status)}`}>
              Оплата: {normalizeEnum(request.payment_status)}
            </span>

            <span className="muted-pill">
              Ответственный: {normalizeEnum(request.current_responsible)}
            </span>
          </div>
        </div>
        <div className="request-card__id">#{request.id}</div>
      </div>

      <p className="request-card__description">{request.description || 'Примечание не указано'}</p>

      <div className="meta-grid">
        <span><strong>Автор:</strong> {request.author_name}</span>
        <span><strong>Объект:</strong> {normalizeEnum(request.object)}</span>
        {materialResponsibles ? (
    <div style={{ marginTop: '8px', fontSize: '13px', color: '#10b981', fontWeight: '500' }}>
      Ответственные: {materialResponsibles}
    </div>
  ) : null}
        <span><strong>Тип:</strong> {normalizeEnum(request.request_type)}</span>
        {/* Статус оплаты из этой сетки удален, так как он теперь сверху */}
        <span><strong>Шифр проекта:</strong> {request.agreement}</span>
        <span><strong>Секция:</strong> {request.section || '—'}</span>
        <span><strong>Дата доставки:</strong> {formatDateTime(request.delivery_date)}</span>
        <span><strong>Фактическая поставка:</strong> {request.real_delivery_date ? formatDateTime(request.real_delivery_date) : '—'}</span>
        <span><strong>Создано:</strong> {formatDateTime(request.created_at)}</span>
      </div>

      <div className="actions-row end">
        <Link className="button secondary" to={`/requests/${request.id}`}>
          Открыть
        </Link>
        {isDraft ? (
          <Link className="button ghost" to={`/requests/${request.id}/edit`}>
            Редактировать
          </Link>
        ) : null}
      </div>
    </article>
  );
}