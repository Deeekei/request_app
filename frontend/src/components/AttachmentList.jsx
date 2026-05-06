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

  if (isLoading) {
    return <div className="empty-box">Загрузка файлов...</div>;
  }

  return (
    <div className="attachment-list">
      {error ? <p className="form-error">{error}</p> : null}

      {!attachments.length ? (
        <div className="empty-box">{emptyText}</div>
      ) : (
        attachments.map((file) => (
          <div className="attachment-item" key={file.id}>
            <div className="attachment-item__info">
              <strong>{file.original_name}</strong>
              <span>{formatFileSize(file.size_bytes)}</span>
              {file.attachment_type ? <span>{normalizeEnum(file.attachment_type)}</span> : null}
            </div>
            <div className="attachment-actions">
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
