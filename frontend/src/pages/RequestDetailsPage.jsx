import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { requestApi } from '../api/requestApi';
import { Alert } from '../components/Alert';
import { CommentsList } from '../components/CommentsList';
import { AttachmentList } from '../components/AttachmentList';
import { AttachmentUpload } from '../components/AttachmentUpload';
import { MaterialsTable } from '../components/MaterialsTable';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatDateTime, normalizeEnum, normalizeRole, statusTone } from '../utils/formatters';

export function RequestDetailsPage() {
  const { token, user } = useAuth();
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [history, setHistory] = useState(null);
  const [comment, setComment] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [attachmentsRefreshKey, setAttachmentsRefreshKey] = useState(0);

  async function loadRequest() {
    setIsLoading(true);
    setError('');
    try {
      const [requestData, historyData] = await Promise.all([
        requestApi.getById(token, requestId),
        requestApi.history(token, requestId).catch(() => null),
      ]);
      setRequest(requestData);
      setHistory(historyData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRequest();
  }, [requestId, token]);

  const roleActions = useMemo(() => ({
    пто: (approve) => requestApi.ptoReview(token, requestId, approve, reviewComment),
    директор: (approve) => requestApi.directorReview(token, requestId, approve, reviewComment),
    заказчик: (approve) => requestApi.customerReview(token, requestId, approve, reviewComment),
  }), [requestId, reviewComment, token]);

  const statusValue = normalizeEnum(request?.status);
const isDraft = statusValue === 'черновик';
const canEdit = isDraft && user?.id === request?.author_id;
const canSubmit = canEdit;
const canDelete = canEdit;

const rawResponsible = normalizeRole(
  request?.current_responsible?.value || request?.current_responsible
);

const currentResponsible = rawResponsible === 'снабжение' && statusValue === 'согласовано'
  ? 'Снабжение'
  : (rawResponsible || '—');

const userRole = normalizeRole(user?.role);

const canReview = userRole === 'администратор'
  ? ['пто', 'директор', 'заказчик'].includes(rawResponsible)
  : Boolean(roleActions[userRole]) && rawResponsible === userRole;

const hasOverdraftMaterials = Array.isArray(request?.materials)
  && request.materials.some((item) => Boolean(item.overdraft ?? item.will_overdraft));

const canDownloadExcel = ['исполнитель', 'снабжение', 'администратор'].includes(userRole) && statusValue === 'согласовано';
const canManageAttachments = ['исполнитель', 'снабжение', 'executor'].includes(userRole) && statusValue === 'согласовано';

  async function handleSubmitRequest() {
    try {
      setSuccess('');
      await requestApi.submit(token, requestId);
      setSuccess('Заявка отправлена на согласование.');
      await loadRequest();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteRequest() {
    try {
      await requestApi.remove(token, requestId);
      navigate('/requests');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    try {
      setSuccess('');
      await requestApi.addComment(token, requestId, comment.trim());
      setComment('');
      setSuccess('Комментарий добавлен.');
      await loadRequest();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDownloadExcel() {
    try {
      setError('');
      const response = await requestApi.downloadExcel(token, requestId);
      if (!response.ok) {
        let detail = 'Не удалось скачать Excel-файл.';
        try {
          const payload = await response.json();
          detail = payload.detail || detail;
        } catch {}
        throw new Error(detail);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `request_${requestId}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReview(approve) {
    try {
      setSuccess('');
      const reviewHandler = userRole === 'администратор' ? roleActions[rawResponsible] : roleActions[userRole];
      if (!reviewHandler) throw new Error('Для этой заявки недоступно согласование.');
      await reviewHandler(approve);
      setSuccess(approve ? 'Решение сохранено.' : 'Заявка отклонена.');
      setReviewComment('');
      await loadRequest();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page-section">
      <PageHeader
        title={request?.title || 'Карточка заявки'}
        subtitle="Детальная информация по заявке, материалам и истории согласования."
        actions={
          <div className="actions-row">
            <Link className="button ghost" to="/requests">К списку</Link>
            {canEdit ? <Link className="button secondary" to={`/requests/${requestId}/edit`}>Редактировать</Link> : null}
          </div>
        }
      />

      {error ? <Alert type="error">{error}</Alert> : null}
      {success ? <Alert type="success">{success}</Alert> : null}
      {isLoading ? <div className="empty-box">Загрузка карточки...</div> : null}

      {request ? (
        <>
          <div className="details-card">
            <div className="details-card__head">
              <div className="meta-line wrap">
                <span className={`pill ${statusTone(request.status)}`}>{normalizeEnum(request.status)}</span>
                <span className="muted-pill">Ответственный: {currentResponsible}</span>
              </div>
              <div className="actions-row">
                {canSubmit ? <button className="button primary" type="button" onClick={handleSubmitRequest}>Отправить на согласование</button> : null}
                {canDownloadExcel ? <button className="button secondary" type="button" onClick={handleDownloadExcel}>Скачать Excel</button> : null}
                {canDelete ? <button className="button danger" type="button" onClick={handleDeleteRequest}>Удалить черновик</button> : null}
              </div>
            </div>

            <div className="details-grid">
              <div><span>ID</span><strong>{request.id}</strong></div>
              <div><span>Автор</span><strong>{request.author_name}</strong></div>
              <div><span>Объект</span><strong>{normalizeEnum(request.object)}</strong></div>
              <div><span>Шифр проекта</span><strong>{request.agreement}</strong></div>
              <div><span>Секция</span><strong>{request.section || "—"}</strong></div>
              <div><span>Дата доставки</span><strong>{request.delivery_date ? formatDate(request.delivery_date) : "—"}</strong></div>
              <div><span>Создано</span><strong>{formatDateTime(request.created_at)}</strong></div>
              <div><span>Обновлено</span><strong>{formatDateTime(request.updated_at)}</strong></div>
            </div>

            <div className="description-box">
              <h2>Примечание</h2>
              <p>{request.description || "—"}</p>
            </div>
          </div>

          <div className="details-card">
            <div className="section-title-row"><h2>Список материалов</h2></div>
            {canReview && hasOverdraftMaterials ? (
              <Alert type="error">В заявке есть материалы с перерасходом. Проверьте проблемные позиции перед принятием решения.</Alert>
            ) : null}
            <MaterialsTable materials={request.materials} highlightOverdraft={canReview} />
          </div>

          {canReview ? (
            <div className="details-card">
              <div className="section-title-row">
                <div>
                  <h2>Решение по заявке</h2>
                  <p>Добавьте комментарий и примите решение по текущему этапу.</p>
                </div>
              </div>
              <div className="field field-wide">
                <label>Комментарий</label>
                <textarea rows={4} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Комментарий к решению" />
              </div>
              <div className="actions-row">
                <button className="button primary" type="button" onClick={() => handleReview(true)}>Одобрить</button>
                <button className="button danger" type="button" onClick={() => handleReview(false)}>Отклонить</button>
              </div>
            </div>
          ) : null}

          <div className="details-card">

          {canManageAttachments ? (
            <div className="details-card">
              <div className="section-title-row">
                <div>
                  <h2>Счета</h2>
                  <p>Поле для загрузки счетов.</p>
                </div>
              </div>
              <AttachmentUpload
                requestId={request.id}
                onUploaded={() => setAttachmentsRefreshKey((value) => value + 1)}
              />
              <AttachmentList
                requestId={request.id}
                refreshKey={attachmentsRefreshKey}
                canDelete={canManageAttachments}
              />
            </div>
          ) : null}
            <div className="section-title-row"><h2>Комментарии</h2></div>
            <form className="form-grid" onSubmit={handleCommentSubmit}>
              <div className="field field-wide">
                <label>Новый комментарий</label>
                <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Введите комментарий" />
              </div>
              <button className="button secondary" type="submit">Добавить комментарий</button>
            </form>
            <CommentsList comments={request.comments} />
          </div>

          <div className="details-card">
            <div className="section-title-row"><h2>История</h2></div>
            {history?.comments?.length ? <CommentsList comments={history.comments} /> : <div className="empty-box">История пока пуста.</div>}
          </div>
        </>
      ) : null}
    </section>
  );
}
