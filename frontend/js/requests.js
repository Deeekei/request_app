// requests.js - Полный набор функций для работы с заявками

// ==================== Базовые операции ====================

/**
 * Получить список заявок с фильтрацией
 * @param {Object} filters - фильтры (status, search, skip, limit)
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function getRequests(filters = {}) {
    console.log('📋 Запрос списка заявок с фильтрами:', filters);
    
    let queryString = '';
    if (Object.keys(filters).length > 0) {
        const params = new URLSearchParams();
        for (let [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value);
            }
        }
        queryString = '?' + params.toString();
    }
    
    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }
        
        const response = await fetch(`${API_BASE_URL}/requests${queryString}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка получения заявок');
        }
        
        return { success: true, data: data };
    } catch (error) {
        console.error('❌ Ошибка получения заявок:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Получить заявку по ID
 * @param {number} requestId - ID заявки
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function getRequestById(requestId) {
    console.log(`🔍 Запрос заявки ID: ${requestId}`);
    
    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }
        
        const response = await fetch(`${API_BASE_URL}/requests/${requestId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка получения заявки');
        }
        
        return { success: true, data: data };
    } catch (error) {
        console.error(`❌ Ошибка получения заявки ${requestId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Создать новую заявку
 * @param {Object} requestData - данные заявки {title, description, agreement, request_materials}
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function createRequest(requestData) {
    console.log('📝 Создание новой заявки:', requestData);

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка создания заявки');
        }

        return { success: true, data: data };
    } catch (error) {
        console.error('❌ Ошибка создания заявки:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Обновить заявку
 * @param {number} requestId - ID заявки
 * @param {Object} requestData - новые данные {title, description, agreement, request_materials}
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function updateRequest(requestId, requestData) {
    console.log(`✏️ Обновление заявки ${requestId}:`, requestData);

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка обновления заявки');
        }

        return { success: true, data: data };
    } catch (error) {
        console.error(`❌ Ошибка обновления заявки ${requestId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Удалить заявку
 * @param {number} requestId - ID заявки
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function deleteRequest(requestId) {
    console.log(`🗑️ Удаление заявки ${requestId}`);

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/${requestId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        // Для 204 No Content возвращаем успех без данных
        if (response.status === 204) {
            return { success: true, data: null };
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка удаления заявки');
        }

        return { success: true, data: data };
    } catch (error) {
        console.error(`❌ Ошибка удаления заявки ${requestId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Отправить заявку на согласование
 * @param {number} requestId - ID заявки
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function submitRequest(requestId) {
    console.log(`📤 Отправка заявки ${requestId} на согласование`);

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/${requestId}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка отправки на согласование');
        }

        return { success: true, data: data };
    } catch (error) {
        console.error(`❌ Ошибка отправки заявки ${requestId} на согласование:`, error);
        return { success: false, error: error.message };
    }
}

// ==================== Работа с комментариями ====================

/**
 * Добавить комментарий к заявке
 * @param {number} requestId - ID заявки
 * @param {string} comment - текст комментария
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function addComment(requestId, comment) {
    console.log(`💬 Добавление комментария к заявке ${requestId}:`, comment);

    if (!comment.trim()) {
        return { success: false, error: 'Комментарий не может быть пустым' };
    }

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/${requestId}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: comment })
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка добавления комментария');
        }

        return { success: true, data: data };
    } catch (error) {
        console.error(`❌ Ошибка добавления комментария к заявке ${requestId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Получить комментарии к заявке
 * @param {number} requestId - ID заявки
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function getComments(requestId) {
    console.log(`💬 Запрос комментариев к заявке ${requestId}`);

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/${requestId}/comments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка получения комментариев');
        }

        return { success: true, data: data };
    } catch (error) {
        console.error(`❌ Ошибка получения комментариев к заявке ${requestId}:`, error);
        return { success: false, error: error.message };
    }
}

// ==================== История заявки ====================

/**
 * Получить историю изменений заявки
 * @param {number} requestId - ID заявки
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function getRequestHistory(requestId) {
    console.log(`📜 Запрос истории заявки ${requestId}`);

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/${requestId}/history`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка получения истории');
        }

        return { success: true, data: data };
    } catch (error) {
        console.error(`❌ Ошибка получения истории заявки ${requestId}:`, error);
        return { success: false, error: error.message };
    }
}

// ==================== Функции для ПТО ====================

/**
 * Проверка заявки сотрудником ПТО
 * @param {number} requestId - ID заявки
 * @param {Object} data - данные проверки {approved: boolean, comment: string}
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function ptoCheck(requestId, data) {
    console.log(`🔧 Проверка ПТО заявки ${requestId}:`, data);

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/${requestId}/pto_check`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.detail || 'Ошибка проверки ПТО');
        }

        return { success: true, data: responseData };
    } catch (error) {
        console.error(`❌ Ошибка проверки ПТО заявки ${requestId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Получить заявки, ожидающие проверки ПТО
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function getPtoPendingRequests() {
    console.log('⏳ Запрос заявок, ожидающих проверки ПТО');

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/pto/pending`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка получения заявок');
        }

        return { success: true, data: data };
    } catch (error) {
        console.error('❌ Ошибка получения заявок для ПТО:', error);
        return { success: false, error: error.message };
    }
}

// ==================== Функции для директора ====================

/**
 * Проверка заявки директором
 * @param {number} requestId - ID заявки
 * @param {Object} data - данные проверки {approved: boolean, comment: string}
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function directorCheck(requestId, data) {
    console.log(`👔 Проверка директором заявки ${requestId}:`, data);

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/${requestId}/director_check`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.detail || 'Ошибка проверки директором');
        }

        return { success: true, data: responseData };
    } catch (error) {
        console.error(`❌ Ошибка проверки директором заявки ${requestId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Получить заявки, ожидающие проверки директором
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function getDirectorPendingRequests() {
    console.log('⏳ Запрос заявок, ожидающих проверки директором');

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/director/pending`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка получения заявок');
        }

        return { success: true, data: data };
    } catch (error) {
        console.error('❌ Ошибка получения заявок для директора:', error);
        return { success: false, error: error.message };
    }
}

// ==================== Функции для заказчика ====================

/**
 * Проверка заявки заказчиком
 * @param {number} requestId - ID заявки
 * @param {Object} data - данные проверки {approved: boolean, comment: string}
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function customerCheck(requestId, data) {
    console.log(`👤 Проверка заказчиком заявки ${requestId}:`, data);

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/${requestId}/customer_check`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.detail || 'Ошибка проверки заказчиком');
        }

        return { success: true, data: responseData };
    } catch (error) {
        console.error(`❌ Ошибка проверки заказчиком заявки ${requestId}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Получить заявки, ожидающие проверки заказчиком
 * @returns {Promise<Object>} - результат с данными или ошибкой
 */
async function getCustomerPendingRequests() {
    console.log('⏳ Запрос заявок, ожидающих проверки заказчиком');

    try {
        const token = getToken();
        if (!token) {
            throw new Error('No token');
        }

        const response = await fetch(`${API_BASE_URL}/requests/customer/pending`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка получения заявок');
        }

        return { success: true, data: data };
    } catch (error) {
        console.error('❌ Ошибка получения заявок для заказчика:', error);
        return { success: false, error: error.message };
    }
}