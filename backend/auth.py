import jwt
import datetime
from functools import wraps
from flask import request, jsonify

SECRET_KEY = "your-secret-key-change-in-production"

def generate_token(user_id, role):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow()
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def decode_token(token):
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to protect routes with JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            payload = decode_token(token)
            if payload is None:
                return jsonify({'message': 'Token is invalid or expired'}), 401
            current_user = payload
        except Exception as e:
            return jsonify({'message': 'Token verification failed'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def role_required(required_role):
    """Decorator to check user role"""
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            if current_user.get('role') != required_role:
                return jsonify({'message': 'Insufficient permissions'}), 403
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator
