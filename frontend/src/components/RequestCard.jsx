import { Link } from 'react-router-dom';
import { formatDateTime, formatStatus, normalizeEnum, statusTone } from '../utils/formatters';

export function RequestCard({ request }) {
  const isDraft = normalizeEnum(request.status).toLowerCase() === 'черновик';

  return (
    <article className="request-card">
      <div className="request-card__header">
        <div>
          <h3>{request.title}</h3>
          <div className="meta-line wrap">
            <span className={`pill ${statusTone(request.status)}`}>{formatStatus(request.status)}</span>
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
        <span><strong>Тип:</strong> {normalizeEnum(request.request_type)}</span>
        <span><strong>Оплата:</strong> {normalizeEnum(request.payment_status)}</span>
        <span><strong>Шифр проекта:</strong> {request.agreement}</span>
        <span><strong>Секция:</strong> {request.section || '—'}</span>
        <span><strong>Дата доставки:</strong> {formatDateTime(request.delivery_date)}</span>
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
