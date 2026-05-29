from flask import Blueprint, request, jsonify, session
from models import db, User, FriendRequest

friends_bp = Blueprint('friends', __name__)

# Поиск пользователей
@friends_bp.route('/api/users/search', methods=['GET'])
def search_users():
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401
    query = request.args.get('q', '').strip()
    if len(query) < 2:
        return jsonify({'ok': False, 'error': 'Минимум 2 символа'}), 400
    users = User.query.filter(
        (User.login.contains(query)) | (User.name.contains(query))
    ).filter(User.id != session['user_id']).limit(10).all()
    return jsonify({'ok': True, 'users': [{'id': u.id, 'login': u.login, 'name': u.name} for u in users]})

# Отправить заявку
@friends_bp.route('/api/friends/request', methods=['POST'])
def send_request():
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401
    data = request.get_json()
    to_user_id = data.get('user_id')
    if not to_user_id or to_user_id == session['user_id']:
        return jsonify({'ok': False, 'error': 'Некорректный пользователь'}), 400
    existing = FriendRequest.query.filter_by(
        from_user_id=session['user_id'], to_user_id=to_user_id, status='pending'
    ).first()
    if existing:
        return jsonify({'ok': False, 'error': 'Заявка уже отправлена'}), 400
    fr = FriendRequest(from_user_id=session['user_id'], to_user_id=to_user_id)
    db.session.add(fr)
    db.session.commit()
    return jsonify({'ok': True, 'message': 'Заявка отправлена'})

# Получить входящие заявки
@friends_bp.route('/api/friends/requests', methods=['GET'])
def get_requests():
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401
    requests = FriendRequest.query.filter_by(to_user_id=session['user_id'], status='pending').all()
    return jsonify({'ok': True, 'requests': [r.to_dict() for r in requests]})

# Принять / отклонить заявку
@friends_bp.route('/api/friends/respond', methods=['POST'])
def respond_request():
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401
    data = request.get_json()
    request_id = data.get('request_id')
    action = data.get('action')  # 'accept' или 'reject'
    fr = FriendRequest.query.filter_by(id=request_id, to_user_id=session['user_id']).first()
    if not fr:
        return jsonify({'ok': False, 'error': 'Заявка не найдена'}), 404
    fr.status = 'accepted' if action == 'accept' else 'rejected'
    db.session.commit()
    return jsonify({'ok': True, 'message': 'Принято' if action == 'accept' else 'Отклонено'})

# Список друзей
@friends_bp.route('/api/friends', methods=['GET'])
def get_friends():
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401
    user = db.session.get(User, session['user_id'])
    friends = User.query.filter(User.id.in_(user.friends)).all()
    return jsonify({'ok': True, 'friends': [{'id': f.id, 'login': f.login, 'name': f.name, 'status': f.status, 'visited_countries': f.visited_countries, 'visited_cities': f.visited_cities} for f in friends]})

@friends_bp.route('/api/friends/remove', methods=['POST'])
def remove_friend():
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401
    data = request.get_json()
    friend_id = data.get('friend_id')
    if not friend_id:
        return jsonify({'ok': False, 'error': 'Некорректные данные'}), 400
    # удаляем заявки в обе стороны
    FriendRequest.query.filter(
        ((FriendRequest.from_user_id == session['user_id']) & (FriendRequest.to_user_id == friend_id)) |
        ((FriendRequest.from_user_id == friend_id) & (FriendRequest.to_user_id == session['user_id']))
    ).delete()
    db.session.commit()
    return jsonify({'ok': True, 'message': 'Друг удалён'})