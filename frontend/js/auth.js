// Конфигурация API
const API_BASE_URL = 'http://127.0.0.1:8000';

// Вспомогательные функции для работы с токеном
function getToken() {
    return localStorage.getItem('access_token');
}

function setToken(token) {
    localStorage.setItem('access_token', token);
}

function removeToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('user_role');
}

function isAuthenticated() {
    return !!getToken();
}

// Функция для входа (только самое необходимое)
async function login(credentials) {
    console.log('🔑 Попытка входа:', credentials.username);

    try {
        // Создаем FormData в формате OAuth2
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);
        formData.append('grant_type', 'password');

        console.log('📤 Отправка запроса...');

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        console.log('📥 Статус ответа:', response.status);

        const data = await response.json();
        console.log('📦 Данные ответа:', data);

        if (!response.ok) {
            return {
                success: false,
                error: data.detail || `Ошибка ${response.status}`
            };
        }

        // Сохраняем данные
        console.log('💾 Сохраняем данные...');
        setToken(data.access_token);
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('username', data.username);
        localStorage.setItem('user_role', data.role);

        console.log('✅ Данные сохранены');

        return { success: true, data: data };
    } catch (error) {
        console.error('❌ Ошибка:', error);
        return {
            success: false,
            error: 'Ошибка соединения с сервером'
        };
    }
}

// Функция для регистрации
async function register(userData) {
    console.log('📝 Регистрация:', userData.username);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.detail };
        }

        return { success: true, data: data };
    } catch (error) {
        return { success: false, error: 'Ошибка соединения с сервером' };
    }
}

// Функция для получения текущего пользователя
async function getCurrentUser() {
    const token = getToken();
    if (!token) {
        throw new Error('No token');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
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
        throw new Error(data.detail || 'Error');
    }

    return data;
}

// Выход
function logout() {
    removeToken();
    window.location.href = 'login.html';
}

// Обработчики событий после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Страница загружена');

    // Обработчик формы входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('🔑 Найдена форма входа');

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('📤 Отправка формы входа');

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (!username || !password) {
                showMessage('Заполните все поля', 'error');
                return;
            }

            const credentials = {
                username: username,
                password: password
            };

            // Блокируем кнопку
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Вход...';
            submitBtn.disabled = true;

            try {
                const result = await login(credentials);

                if (result.success) {
                    showMessage('Вход выполнен! Перенаправление...', 'success');
                    console.log('✅ Успех, перенаправляем...');

                    setTimeout(function() {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showMessage(result.error, 'error');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                showMessage('Произошла ошибка', 'error');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Обработчик формы регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        console.log('📝 Найдена форма регистрации');

        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const fullname = document.getElementById('fullname').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (!username || !fullname || !password || !confirmPassword) {
                showMessage('Заполните все поля', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showMessage('Пароли не совпадают', 'error');
                return;
            }

            const userData = {
                username: username,
                full_name: fullname,
                password: password
            };

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Регистрация...';
            submitBtn.disabled = true;

            const result = await register(userData);

            if (result.success) {
                showMessage('Регистрация успешна! Перенаправление на вход...', 'success');
                setTimeout(function() {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showMessage(result.error, 'error');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// Функция для показа сообщений
function showMessage(text, type) {
    console.log(`📢 ${type}: ${text}`);

    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
    }
}