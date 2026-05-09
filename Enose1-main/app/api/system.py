from flask import Blueprint, request, jsonify
from app.serial_bridge import manager as serial_mgr
from app.models import settings as settings_model

bp = Blueprint('system', __name__)


@bp.get('/ports')
def list_ports():
    return jsonify(serial_mgr.list_ports())


@bp.get('/status')
def status():
    return jsonify({
        'serial': serial_mgr.get_state(),
        'setup_done': settings_model.get('setup_done', '0') == '1',
    })


@bp.post('/connect')
def connect():
    data = request.json or {}
    port = data.get('port', '').strip()
    baud = int(data.get('baud', 115200))
    if not port:
        return jsonify({'error': 'port required'}), 400
    ok, msg = serial_mgr.connect(port, baud)
    if ok:
        settings_model.set_many({'com_port': port, 'baud_rate': baud})
    return jsonify({'ok': ok, 'message': msg})


@bp.post('/disconnect')
def disconnect():
    serial_mgr.disconnect()
    return jsonify({'ok': True})


@bp.get('/settings')
def get_settings():
    return jsonify(settings_model.get_all())


@bp.post('/settings')
def save_settings():
    data = request.json or {}
    settings_model.set_many(data)
    return jsonify({'ok': True})
