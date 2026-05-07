"""маршруты личного кабинета - получение и обновление профиля пользователя"""
from flask import Blueprint, jsonify, session, request
from models import db, User

profile_bp = Blueprint('profile', __name__)


#получаю профиль
@profile_bp.route('/api/profile', methods=['GET'])
def get_profile():
    """расширенные данные профиля: статус, статистика, пол, дата рождения"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    user = db.session.get(User, session['user_id'])
    if not user:
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
            'visited_cities':   user.visited_cities,
            'gender':           user.gender,
            'birth_date':       user.birth_date,
        }
    })


#обновление
@profile_bp.route('/api/profile', methods=['PUT'])
def update_profile():
    """обновить имя, пол и дату рождения"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'ok': False, 'error': 'Пользователь не найден'}), 404

    data = request.get_json()

    if 'name' in data:
        user.name = data['name']
    if 'gender' in data:
        user.gender = data['gender']
    if 'birth_date' in data:
        user.birth_date = data['birth_date']

    db.session.commit()
    return jsonify({'ok': True, 'message': 'Профиль обновлён'})