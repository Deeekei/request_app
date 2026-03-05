// Конфигурация API
const API_BASE_URL = 'http://127.0.0.1:8000'; // Замените на ваш URL

// Вспомогательные функции для работы с токеном
function getToken() {
    return localStorage.getItem('access_token');
}

function setToken(token) {
    localStorage.setItem('access_token', token);
}

function removeToken() {
    localStorage.removeItem('access_token');
}

function isAuthenticated() {
    return !!getToken();
}

// Базовые функции для запросов
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers
    };
    
    try {
        const response = await fetch(url, config);
        
        // Проверяем на истечение токена
        if (response.status === 401) {
            removeToken();
            throw new Error('Token expired');
        }
        
        // Для 204 No Content
        if (response.status === 204) {
            return null;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Произошла ошибка');
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// HTTP методы
async function get(endpoint) {
    return apiRequest(endpoint, { method: 'GET' });
}

async function post(endpoint, data) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function put(endpoint, data) {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function del(endpoint) {
    return apiRequest(endpoint, { method: 'DELETE' });
}