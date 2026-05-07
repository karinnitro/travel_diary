from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()


#пользователь
class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    login         = db.Column(db.String(50), unique=True, nullable=False)
    name          = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    avatar        = db.Column(db.String(200), nullable=True)        
    gender        = db.Column(db.String(10), nullable=True)         
    birth_date    = db.Column(db.String(20), nullable=True)         

    #связи с другими таблицами
    trips   = db.relationship('Trip',   backref='user', lazy=True, cascade='all, delete-orphan')
    markers = db.relationship('Marker', backref='user', lazy=True, cascade='all, delete-orphan')

    #пароли
    def set_password(self, password):
        """хешировать и сохранить пароль"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """проверить пароль"""
        return check_password_hash(self.password_hash, password)

    #статистика

    @property
    def visited_countries(self):
        """количество уникальных посещенных стран"""
        visited = Trip.query.filter_by(user_id=self.id, is_planned=False).all()
        return len(set(t.country for t in visited))

    @property
    def visited_cities(self):
        """количество уникальных посещенных городов"""
        visited = Trip.query.filter_by(user_id=self.id, is_planned=False).all()
        return len(set(t.city for t in visited))

    @property
    def status(self):
        """статус путешественника"""
        countries = self.visited_countries
        cities    = self.visited_cities
        if countries >= 11 and cities >= 21:
            return 'Эксперт'
        elif countries >= 4 and cities >= 11:
            return 'Любитель'
        else:
            return 'Новичок'

#поездки
class Trip(db.Model):
    __tablename__ = 'trips'

    id          = db.Column(db.Integer, primary_key=True)
    country     = db.Column(db.String(100), nullable=False)
    city        = db.Column(db.String(100), nullable=False)
    year        = db.Column(db.Integer, nullable=False)
    date        = db.Column(db.String(20), nullable=True)       
    impressions = db.Column(db.Text, nullable=True)             #текст впечатлений
    rating      = db.Column(db.Integer, nullable=True)          
    photo       = db.Column(db.String(200), nullable=True)      
    is_planned  = db.Column(db.Boolean, default=False)         
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            'id':          self.id,
            'country':     self.country,
            'city':        self.city,
            'year':        self.year,
            'date':        self.date,
            'impressions': self.impressions,
            'rating':      self.rating,
            'photo':       self.photo,
            'is_planned':  self.is_planned,
            'created_at':  self.created_at.isoformat() if self.created_at else None,
        }


#маркер на карте
class Marker(db.Model):
    __tablename__ = 'markers'

    id        = db.Column(db.Integer, primary_key=True)
    latitude  = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    country   = db.Column(db.String(100), nullable=True)
    city      = db.Column(db.String(100), nullable=True)
    color     = db.Column(db.String(20), default='blue')        
    trip_id   = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=True)

    user_id   = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            'id':        self.id,
            'latitude':  self.latitude,
            'longitude': self.longitude,
            'country':   self.country,
            'city':      self.city,
            'color':     self.color,
            'trip_id':   self.trip_id,
        }