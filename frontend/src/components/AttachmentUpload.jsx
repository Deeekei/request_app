import { useRef, useState } from 'react';
import { attachmentApi } from '../api/attachmentApi';
import { useAuth } from '../context/AuthContext';

const MAX_CLIENT_SIZE = 20 * 1024 * 1024;

export function AttachmentUpload({ requestId, onUploaded }) {
  const { token } = useAuth();
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    if (file.size > MAX_CLIENT_SIZE) {
      setError('Файл слишком большой. Максимальный размер — 20 МБ.');
      event.target.value = '';
      return;
    }

    try {
      setIsUploading(true);
      await attachmentApi.upload(token, requestId, file);
      event.target.value = '';
      onUploaded?.();
    } catch (err) {
      setError(err.message || 'Не удалось загрузить файл.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="attachment-upload">
      <input
        ref={inputRef}
        className="attachment-input"
        type="file"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <p className="attachment-hint">Можно прикрепить PDF, изображения, Word или Excel. Максимум 20 МБ.</p>
      {isUploading ? <p className="muted">Загрузка файла...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
