"""маршруты маркеров - получение, добавление, обновление цвета, удаление"""
from flask import Blueprint, request, jsonify, session
from models import db, Marker, Trip

markers_bp = Blueprint('markers', __name__)


#получение всех маркеров
@markers_bp.route('/api/markers', methods=['GET'])
def get_markers():
    """Список всех маркеров текущего пользователя"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    markers = Marker.query.filter_by(user_id=session['user_id']).all()
    return jsonify({'ok': True, 'markers': [m.to_dict() for m in markers]})


#добавление маркера
@markers_bp.route('/api/markers', methods=['POST'])
def add_marker():
    """Создание нового маркера (с привязкой к поездке)"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    data = request.get_json()
    marker = Marker(
        latitude  = data['latitude'],
        longitude = data['longitude'],
        country   = data.get('country', ''),
        city      = data.get('city', ''),
        color     = data.get('color', 'blue'),
        trip_id   = data.get('trip_id'),
        user_id   = session['user_id']
    )
    db.session.add(marker)
    db.session.commit()

    return jsonify({'ok': True, 'marker': marker.to_dict()}), 201


#обновление цвета маркера
@markers_bp.route('/api/markers/<int:marker_id>', methods=['PUT'])
def update_marker(marker_id):
    """изменить цвет маркера (посещен/запланирован)"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    marker = Marker.query.filter_by(id=marker_id, user_id=session['user_id']).first()
    if not marker:
        return jsonify({'ok': False, 'error': 'Маркер не найден'}), 404

    data = request.get_json()
    if 'color' in data:
        marker.color = data['color']

    db.session.commit()
    return jsonify({'ok': True, 'marker': marker.to_dict()})


#удалить маркер
@markers_bp.route('/api/markers/<int:marker_id>', methods=['DELETE'])
def delete_marker(marker_id):
    """удалить маркер и связанную с ним поездку"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    marker = Marker.query.filter_by(id=marker_id, user_id=session['user_id']).first()
    if not marker:
        return jsonify({'ok': False, 'error': 'Маркер не найден'}), 404

    #удаление связанной поездки
    if marker.trip_id:
        trip = Trip.query.filter_by(id=marker.trip_id, user_id=session['user_id']).first()
        if trip:
            db.session.delete(trip)

    db.session.delete(marker)
    db.session.commit()
    return jsonify({'ok': True, 'message': 'Маркер удалён'})