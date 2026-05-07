"""регистрация, вход, выход, проверка сессии"""
from flask import Blueprint, request, jsonify, session
from models import db, User

auth_bp = Blueprint('auth', __name__)


#регистрация
@auth_bp.route('/api/register', methods=['POST'])
def register():
    """создание нового пользователя"""
    data = request.get_json()

    login    = data.get('login', '').strip()
    password = data.get('password', '')
    name     = data.get('name', '').strip()

    #проверки
    if not login or not password or not name:
        return jsonify({'ok': False, 'error': 'Заполните все поля'}), 400
    if len(login) < 3:
        return jsonify({'ok': False, 'error': 'Логин должен содержать минимум 3 символа'}), 400
    if len(password) < 6:
        return jsonify({'ok': False, 'error': 'Пароль должен содержать минимум 6 символов'}), 400

    #уникальность логина
    if User.query.filter_by(login=login).first():
        return jsonify({'ok': False, 'error': 'Пользователь с таким логином уже существует'}), 400

    #создание пользователя
    user = User(login=login, name=name)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    #сохранение в сессии
    session['user_id'] = user.id

    return jsonify({
        'ok': True,
        'user': {
            'id':         user.id,
            'login':      user.login,
            'name':       user.name,
            'created_at': user.created_at.isoformat()
        }
    }), 201


#вход
@auth_bp.route('/api/login', methods=['POST'])
def login():
    """вход по логину и паролю"""
    data = request.get_json()

    login    = data.get('login', '').strip()
    password = data.get('password', '')

    if not login or not password:
        return jsonify({'ok': False, 'error': 'Заполните все поля'}), 400

    user = User.query.filter_by(login=login).first()
    if not user or not user.check_password(password):
        return jsonify({'ok': False, 'error': 'Неверный логин или пароль'}), 401

    session['user_id'] = user.id

    return jsonify({
        'ok': True,
        'user': {
            'id':         user.id,
            'login':      user.login,
            'name':       user.name,
            'created_at': user.created_at.isoformat()
        }
    })


#выход
@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    """завершение сессии"""
    session.pop('user_id', None)
    return jsonify({'ok': True})


#проверка сессии
@auth_bp.route('/api/me', methods=['GET'])
def get_me():
    """получение текущего пользователя по сессии"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    user = db.session.get(User, session['user_id'])
    if not user:
        session.pop('user_id', None)
        return jsonify({'ok': False, 'error': 'Пользователь не найден'}), 404

    return jsonify({
        'ok': True,
        'user': {
            'id':               user.id,
            'login':            user.login,
            'name':             user.name,
            'created_at':       user.created_at.isoformat(),
            'status':           user.status,
            'visited_countries': user.visited_countries,
            'visited_cities':   user.visited_cities
        }
    })