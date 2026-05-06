import { useRef, useState } from 'react';
import { attachmentApi } from '../api/attachmentApi';
import { useAuth } from '../context/AuthContext';

const MAX_CLIENT_SIZE = 20 * 1024 * 1024;

export function AttachmentUpload({
  requestId,
  attachmentType = 'REQUEST_FILE',
  onUploaded,
  title = 'Выберите файл',
  buttonLabel = 'Загрузить',
}) {
  const { token } = useAuth();
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError('');
    setSuccess('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_CLIENT_SIZE) {
      setError('Файл слишком большой. Максимальный размер — 20 МБ.');
      setSelectedFile(null);
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || !requestId) return;

    try {
      setIsUploading(true);
      setError('');
      setSuccess('');
      await attachmentApi.upload(token, requestId, selectedFile, attachmentType);
      setSelectedFile(null);
      setSuccess('Файл успешно загружен.');
      if (inputRef.current) inputRef.current.value = '';
      onUploaded?.();
    } catch (err) {
      setError(err.message || 'Не удалось загрузить файл.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="attachment-upload">
      <label className="attachment-upload__label">{title}</label>
      <input
        ref={inputRef}
        className="attachment-input"
        type="file"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {selectedFile ? (
        <p className="attachment-selected">Выбран файл: <strong>{selectedFile.name}</strong></p>
      ) : null}

      <div className="actions-row">
        <button
          className="button secondary"
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? 'Загрузка...' : buttonLabel}
        </button>
      </div>

      <p className="attachment-hint">Можно прикрепить PDF, изображения, Word или Excel. Максимум 20 МБ.</p>
      {success ? <p className="form-success">{success}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
