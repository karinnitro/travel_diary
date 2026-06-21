from flask import Blueprint, request, jsonify, session
from models import db, User, Trip, Marker, FriendRequest

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/api/admin/users', methods=['GET'])
def get_users():
    if 'user_id' not in session:
        return jsonify({'ok': False}), 401
    admin = db.session.get(User, session['user_id'])
    if not admin or not admin.is_admin:
        return jsonify({'ok': False, 'error': 'Нет доступа'}), 403
    users = User.query.filter_by(is_admin=False).all()
    result = []
    for u in users:
        trips_count = Trip.query.filter_by(user_id=u.id).count()
        markers_count = Marker.query.filter_by(user_id=u.id).count()
        result.append({
            'id': u.id, 'login': u.login, 'name': u.name,
            'status': u.status, 'is_admin': u.is_admin,
            'created_at': u.created_at.isoformat(),
            'visited_countries': u.visited_countries,
            'visited_cities': u.visited_cities,
            'trips_count': trips_count,
            'markers_count': markers_count
        })
    return jsonify({'ok': True, 'users': result})

@admin_bp.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    if 'user_id' not in session:
        return jsonify({'ok': False}), 401
    admin = db.session.get(User, session['user_id'])
    if not admin or not admin.is_admin:
        return jsonify({'ok': False, 'error': 'Нет доступа'}), 403
    if user_id == admin.id:
        return jsonify({'ok': False, 'error': 'Нельзя удалить себя'}), 400
    
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'ok': False}), 404
    
    # удаляем связанные данные
    Trip.query.filter_by(user_id=user_id).delete()
    Marker.query.filter_by(user_id=user_id).delete()
    FriendRequest.query.filter((FriendRequest.from_user_id == user_id) | (FriendRequest.to_user_id == user_id)).delete()
    
    db.session.delete(user)
    db.session.commit()
    return jsonify({'ok': True})

@admin_bp.route('/api/admin/stats', methods=['GET'])
def get_stats():
    if 'user_id' not in session:
        return jsonify({'ok': False}), 401
    admin = db.session.get(User, session['user_id'])
    if not admin or not admin.is_admin:
        return jsonify({'ok': False}), 403
    return jsonify({'ok': True, 'stats': {
        'users': User.query.filter_by(is_admin=False).count(),
        'trips': Trip.query.filter(Trip.user.has(is_admin=False)).count(),
        'markers': Marker.query.filter(Marker.user.has(is_admin=False)).count()
    }})