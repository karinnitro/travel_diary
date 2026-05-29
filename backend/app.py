"""создание приложения и запуск"""
from flask import Flask, send_from_directory
from flask_cors import CORS
import os
from config import Config
from models import db


def create_app():
    """ настройка бд, маршруты API"""
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    CORS(app, supports_credentials=True)

    # подключаю бд
    db.init_app(app)

    # регистрирую апи-маршруты
    from routes.auth import auth_bp          # вход/регистрация/выход
    from routes.trips import trips_bp        # круд поездок
    from routes.markers import markers_bp    # маркеры на карте
    from routes.profile import profile_bp 
    from routes.friends import friends_bp   # личный кабинет

    app.register_blueprint(auth_bp)
    app.register_blueprint(trips_bp)
    app.register_blueprint(markers_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(friends_bp)

    # путь к папке frontend 
    FRONTEND_DIR = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'frontend'
    )



    @app.route('/')
    def index():
        """главная HTML-страница"""
        return send_from_directory(FRONTEND_DIR, 'index.html')

    @app.route('/<path:filename>')
    def serve_static(filename):
        """статические файлы: CSS, JS, фото, шрифты"""
        return send_from_directory(FRONTEND_DIR, filename)

    # создание таблицы бд при первом запуске
    with app.app_context():
        db.create_all()

    return app


#выход
if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)