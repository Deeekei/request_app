import { apiRequest, buildAuthHeaders } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function makeFormData(file) {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

export const attachmentApi = {
  uploadRequestFile(token, requestId, file) {
    return apiRequest(`/attachments/requests/${requestId}/files`, {
      method: 'POST',
      headers: buildAuthHeaders(token, { json: false }),
      body: makeFormData(file),
    });
  },

  uploadInvoice(token, requestId, file) {
    return apiRequest(`/attachments/requests/${requestId}/invoices`, {
      method: 'POST',
      headers: buildAuthHeaders(token, { json: false }),
      body: makeFormData(file),
    });
  },

  // НОВОЕ: Метод для загрузки УПД
  uploadUpd(token, requestId, file) {
    return apiRequest(`/attachments/requests/${requestId}/upd`, {
      method: 'POST',
      headers: buildAuthHeaders(token, { json: false }),
      body: makeFormData(file),
    });
  },

  // ОБНОВЛЕНО: Обратная совместимость. Теперь поддерживает и UPD.
  upload(token, requestId, file, attachmentType = 'REQUEST_FILE') {
    if (attachmentType === 'INVOICE') return this.uploadInvoice(token, requestId, file);
    if (attachmentType === 'UPD') return this.uploadUpd(token, requestId, file);
    return this.uploadRequestFile(token, requestId, file);
  },

  // НОВОЕ: Обновление статусов счета
  updateInvoiceStatus(token, attachmentId, payload) {
    return apiRequest(`/attachments/${attachmentId}/invoice-status`, {
      method: 'PATCH',
      headers: buildAuthHeaders(token, { json: true }),
      body: JSON.stringify(payload), // Теперь дата точно отправится!
    });
  },

  list(token, requestId, attachmentType = null) {
    const query = attachmentType ? `?attachment_type=${encodeURIComponent(attachmentType)}` : '';
    return apiRequest(`/attachments/requests/${requestId}${query}`, {
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  async download(token, attachmentId) {
    const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/download`, {
      method: 'GET',
      headers: buildAuthHeaders(token, { json: false }),
    });

    if (!response.ok) {
      let detail = 'Не удалось скачать файл.';
      try {
        const payload = await response.json();
        detail = payload?.detail || detail;
      } catch {}
      throw new Error(detail);
    }

    return response;
  },

  remove(token, attachmentId) {
    return apiRequest(`/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(token, { json: false }),
    });
  },
};