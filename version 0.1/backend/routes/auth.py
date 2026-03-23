from flask import Blueprint, request, jsonify
from models import db, User
import jwt
from config import Config
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    user = User(username=data['username'], role=data.get('role','user'))
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    return jsonify({'message':'User created'})


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    user = User.query.filter_by(username=data['username']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'message':'Invalid credentials'}), 401

    token = jwt.encode({
        'id': user.id,
        'exp': datetime.utcnow() + timedelta(hours=12)
    }, Config.SECRET_KEY, algorithm="HS256")

    return jsonify({'token': token, 'role': user.role})