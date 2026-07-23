import { useEffect, useState } from 'react';
import { attachmentApi } from '../api/attachmentApi';
import { useAuth } from '../context/AuthContext';
import { normalizeEnum } from '../utils/formatters';

function formatFileSize(bytes) {
  if (!bytes) return '0 Б';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function getFileNameFromDisposition(header) {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || null;
}

export function AttachmentList({
  requestId,
  refreshKey = 0,
  canDelete = false,
  attachmentType = null,
  emptyText = 'Файлы пока не прикреплены.',
  canEditInvoiceStatus = false,
}) {
  const { token } = useAuth();
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadAttachments() {
    try {
      setIsLoading(true);
      setError('');
      const data = await attachmentApi.list(token, requestId, attachmentType);
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить список файлов.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (requestId && token) {
      loadAttachments();
    }
  }, [requestId, refreshKey, token, attachmentType]);

  async function handleDownload(file) {
    try {
      setError('');
      const response = await attachmentApi.download(token, file.id);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = getFileNameFromDisposition(response.headers.get('content-disposition')) || file.original_name || `attachment_${file.id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Не удалось скачать файл.');
    }
  }

  async function handleDelete(file) {
    if (!window.confirm(`Удалить файл «${file.original_name}»?`)) return;
    try {
      setError('');
      await attachmentApi.remove(token, file.id);
      await loadAttachments();
    } catch (err) {
      setError(err.message || 'Не удалось удалить файл.');
    }
  }

  async function handleStatusChange(file, field, value) {
    try {
      setError('');
      const payload = {};
      if (field === 'payment') payload.payment_status = value;
      else if (field === 'approval') payload.approval_status = value;
      else if (field === 'delivery') payload.delivery_date = value || null;
      else if (field === 'is_delivered') payload.is_delivered = value; // НОВОЕ: Отправляем статус доставки

      await attachmentApi.updateInvoiceStatus(token, file.id, payload);
      await loadAttachments();
    } catch (err) {
      setError(err.message || 'Не удалось обновить данные счета.');
    }
  }

  if (isLoading) return <div className="empty-box">Загрузка файлов...</div>;

  return (
    <div className="attachment-list">
      {error ? <p className="form-error">{error}</p> : null}

      {!attachments.length ? (
        <div className="empty-box">{emptyText}</div>
      ) : (
        attachments.map((file) => (
          <div className="attachment-item" key={file.id} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div className="attachment-item__info" style={{ flex: 1 }}>
              <strong>{file.original_name}</strong>
              <span style={{ marginLeft: '8px', color: '#666' }}>{formatFileSize(file.size_bytes)}</span>
              {file.attachment_type ? <span style={{ marginLeft: '8px', fontSize: '0.9em' }}>{normalizeEnum(file.attachment_type)}</span> : null}

              {String(file.attachment_type).toLowerCase() === 'invoice' && (
                <div className="invoice-statuses" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '8px', background: '#f9f9f9', padding: '6px 10px', borderRadius: '4px', width: 'fit-content' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85em', color: '#333' }}>
                    Рассмотрение:
                    <select
                      value={file.approval_status || 'UNDER_REVIEW'}
                      onChange={(e) => handleStatusChange(file, 'approval', e.target.value)}
                      disabled={!canEditInvoiceStatus}
                      style={{ padding: '2px 4px', fontSize: '1em' }}
                    >
                      <option value="UNDER_REVIEW">На рассмотрении</option>
                      <option value="FOR_PAYMENT">На оплату</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85em', color: '#333' }}>
                    Оплата:
                    <select
                      value={file.payment_status || 'UNPAID'}
                      onChange={(e) => handleStatusChange(file, 'payment', e.target.value)}
                      disabled={!canEditInvoiceStatus}
                      style={{ padding: '2px 4px', fontSize: '1em' }}
                    >
                      <option value="UNPAID">Неоплачено</option>
                      <option value="PAID">Оплачено</option>
                      <option value="ADVANCE_50">Аванс 50%</option>
                      <option value="DEFERRED">В отсрочку</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85em', color: '#333' }}>
                    Ожидается:
                    <input
                      type="date"
                      value={file.delivery_date ? file.delivery_date.substring(0, 10) : ''}
                      onChange={(e) => handleStatusChange(file, 'delivery', e.target.value)}
                      disabled={!canEditInvoiceStatus}
                      style={{ padding: '1px 4px', fontSize: '1em', border: '1px solid #ccc', borderRadius: '3px' }}
                    />
                  </label>

                  {/* НОВОЕ: Статус доставки */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85em', color: '#333' }}>
                    Доставка:
                    <select
                      value={file.is_delivered ? 'true' : 'false'}
                      onChange={(e) => handleStatusChange(file, 'is_delivered', e.target.value === 'true')}
                      disabled={!canEditInvoiceStatus}
                      style={{ padding: '2px 4px', fontSize: '1em', fontWeight: file.is_delivered ? 'bold' : 'normal', color: file.is_delivered ? '#10b981' : '#333' }}
                    >
                      <option value="false">Не доставлено</option>
                      <option value="true">Доставлено</option>
                    </select>
                  </label>
                </div>
              )}
            </div>

            <div className="attachment-actions" style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
              <button className="button secondary small" type="button" onClick={() => handleDownload(file)}>
                Скачать
              </button>
              {canDelete ? (
                <button className="button danger small" type="button" onClick={() => handleDelete(file)}>
                  Удалить
                </button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}