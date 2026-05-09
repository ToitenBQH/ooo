from flask import Flask
from flask_socketio import SocketIO
from .config import Config
from .models.database import init_db, close_db
from .automation.pipeline import init_engine
from .serial_bridge import manager as serial_mgr

socketio = SocketIO()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Init extensions
    socketio.init_app(app, async_mode='threading', cors_allowed_origins='*')

    # Init database
    init_db(app)
    app.teardown_appcontext(close_db)

    # Register API blueprints
    from .api.projects import bp as proj_bp
    from .api.sessions import bp as sess_bp
    from .api.measurements import bp as meas_bp
    from .api.device import bp as device_bp
    from .api.automation import bp as auto_bp
    from .api.system import bp as sys_bp

    app.register_blueprint(proj_bp,   url_prefix='/api/projects')
    app.register_blueprint(sess_bp,   url_prefix='/api/sessions')
    app.register_blueprint(meas_bp,   url_prefix='/api/measurements')
    app.register_blueprint(device_bp, url_prefix='/api/device')
    app.register_blueprint(auto_bp,   url_prefix='/api/automation')
    app.register_blueprint(sys_bp,    url_prefix='/api/system')

    # Register page routes
    from .views import views_bp
    app.register_blueprint(views_bp)

    # Register SocketIO events
    from .events.socket_events import register as register_events
    register_events(socketio)

    # Init automation engine
    from .models import session as sess_model
    init_engine(
        serial_send_fn=serial_mgr.send_command,
        socketio=socketio,
        session_start_fn=lambda sid: sess_model.start(sid),
        session_stop_fn=lambda sid: sess_model.stop(sid),
    )

    # Auto-reconnect on startup if COM was previously configured
    with app.app_context():
        from .models import settings as settings_model
        ports = serial_mgr.list_ports()
        saved_port = settings_model.get('com_port', '')
        saved_baud = int(settings_model.get('baud_rate', 115200))
        # Only auto-connect if port is in available ports
        available = [p['port'] for p in ports]
        if saved_port and saved_port in available:
            serial_mgr.connect(saved_port, saved_baud)

    return app
