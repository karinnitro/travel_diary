"""настройка Flask, бд, загрузка файлов"""
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Основные настройки приложения"""
    #ключ для подписи сессий 
    SECRET_KEY = 'tripmap-super-secret-key-change-in-production'

    # путь к файлу бд
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'tripmap.db')

    # отключение отслеживания изменений
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # папка для загрузки файлов 
    UPLOAD_FOLDER = os.path.join(os.path.dirname(BASE_DIR), 'uploads')

    # максимальный размер загружаемого файла-16 МБ
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024