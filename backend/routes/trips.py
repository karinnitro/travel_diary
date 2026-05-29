"""маршруты поездок - круд"""
from flask import Blueprint, request, jsonify, session
from models import db, Trip

trips_bp = Blueprint('trips', __name__)


#получение всех поездок
@trips_bp.route('/api/trips', methods=['GET'])
def get_trips():
    """список всех поездок пользователя (новые сверху)"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    trips = (
        Trip.query
        .filter_by(user_id=session['user_id'])
        .order_by(Trip.created_at.desc())
        .all()
    )
    return jsonify({'ok': True, 'trips': [t.to_dict() for t in trips]})


#добавление поездки
@trips_bp.route('/api/trips', methods=['POST'])
def add_trip():
    """создание новой поездки"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    data = request.get_json()
    trip = Trip(
        country     = data['country'],
        city        = data['city'],
        year        = data['year'],
        date        = data.get('date', ''),
        impressions = data.get('impressions', ''),
        rating      = data.get('rating'),
        photo       = data.get('photo'),
        photo_key=data.get('photo_key'),
        photos=data.get('photos_json'),
        is_planned  = data.get('is_planned', False),
        user_id     = session['user_id']
    )
    db.session.add(trip)
    db.session.commit()

    return jsonify({'ok': True, 'trip': trip.to_dict()}), 201


#обновление поездки
@trips_bp.route('/api/trips/<int:trip_id>', methods=['PUT'])
def update_trip(trip_id):
    """редактирование поездки"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    trip = Trip.query.filter_by(id=trip_id, user_id=session['user_id']).first()
    if not trip:
        return jsonify({'ok': False, 'error': 'Поездка не найдена'}), 404

    data = request.get_json()
    trip.country     = data.get('country',     trip.country)
    trip.city        = data.get('city',        trip.city)
    trip.year        = data.get('year',        trip.year)
    trip.date        = data.get('date',        trip.date)
    trip.impressions = data.get('impressions', trip.impressions)
    trip.rating      = data.get('rating',      trip.rating)
    trip.photo       = data.get('photo',       trip.photo)
    trip.photo_key = data.get('photo_key', trip.photo_key)
    trip.photos = data.get('photos', trip.photos)
    trip.is_planned  = data.get('is_planned',  trip.is_planned)

    db.session.commit()
    return jsonify({'ok': True, 'trip': trip.to_dict()})


#удаление поездки
@trips_bp.route('/api/trips/<int:trip_id>', methods=['DELETE'])
def delete_trip(trip_id):
    """удаление поездки"""
    if 'user_id' not in session:
        return jsonify({'ok': False, 'error': 'Не авторизован'}), 401

    trip = Trip.query.filter_by(id=trip_id, user_id=session['user_id']).first()
    if not trip:
        return jsonify({'ok': False, 'error': 'Поездка не найдена'}), 404

    db.session.delete(trip)
    db.session.commit()
    return jsonify({'ok': True, 'message': 'Поездка удалена'})