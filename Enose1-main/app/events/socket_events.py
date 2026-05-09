from flask_socketio import SocketIO
from app.serial_bridge import manager as serial_mgr
from app.models import measurement as meas_model
from app.models import session as sess_model

socketio: SocketIO = None
_active_session_id = None


def register(sio: SocketIO):
    global socketio
    socketio = sio

    @sio.on('connect', namespace='/live')
    def on_connect():
        print('[WS] Client connected to /live')

    @sio.on('disconnect', namespace='/live')
    def on_disconnect():
        print('[WS] Client disconnected from /live')

    @sio.on('set_active_session', namespace='/live')
    def on_set_session(data):
        global _active_session_id
        _active_session_id = data.get('session_id')
        print(f'[WS] Active session set: {_active_session_id}')

    # Wire serial data callback
    serial_mgr._on_data_cb = _handle_sensor_data
    serial_mgr._on_status_cb = _handle_serial_status


def _handle_sensor_data(parsed: dict):
    """Called by serial read thread on every DATA frame."""
    sio = socketio
    if not sio:
        return

    # Always emit live data regardless of recording status
    sio.emit('sensor_data', parsed, namespace='/live')

    # Save to DB only when a session is actively recording
    if _active_session_id:
        sess = sess_model.get_by_id(_active_session_id)
        if sess and sess['status'] == 'recording':
            # Include current device state from serial manager
            parsed['pump_speed'] = 0
            parsed['valve1'] = 0
            parsed['valve2'] = 0
            meas_model.insert_one(_active_session_id, parsed)


def _handle_serial_status(status: str):
    if socketio:
        socketio.emit('serial_status', {'status': status}, namespace='/live')


def set_active_session(session_id):
    global _active_session_id
    _active_session_id = session_id


def get_active_session():
    return _active_session_id
