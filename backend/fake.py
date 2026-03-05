from datetime import datetime, timezone
from backend.schemas.request_models import Request, OrderStatus, Comment
from backend.schemas.auth_models import User, UserRole

# Users DB
users_db = {
    1: User(id=1, username="user", hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYNkMVK7UjG", role=UserRole.USER),  # password
    2: User(id=2, username="pto", hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYNkMVK7UjG", role=UserRole.PTO),
    3: User(id=3, username="director", hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYNkMVK7UjG", role=UserRole.DIRECTOR),
    4: User(id=4, username="customer", hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYNkMVK7UjG", role=UserRole.CUSTOMER),
}

# Requests DB
request_db = {}

_request_counter = 0
_comment_counter = 0

def get_next_request_id():
    global _request_counter
    _request_counter += 1
    return _request_counter

def get_next_comment_id():
    global _comment_counter
    _comment_counter += 1
    return _comment_counter
