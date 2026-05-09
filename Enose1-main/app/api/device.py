from flask import Blueprint, request, jsonify
from app.serial_bridge import manager as serial_mgr

bp = Blueprint('device', __name__)

_device_state = {
    'valve1': False,
    'valve2': False,
    'pump_speed': 0,
}


def get_state():
    return dict(_device_state)


@bp.get('/state')
def get_device_state():
    return jsonify({**_device_state, 'connected': serial_mgr.get_state()['connected']})


@bp.post('/valve')
def control_valve():
    data = request.json or {}
    valve = data.get('valve')
    state = bool(data.get('state', False))
    if valve not in (1, 2):
        return jsonify({'error': 'valve must be 1 or 2'}), 400
    cmd = f'VALVE{valve}:{"ON" if state else "OFF"}'
    ok = serial_mgr.send_command(cmd)
    if ok:
        _device_state[f'valve{valve}'] = state
    return jsonify({'ok': ok, 'command': cmd})


@bp.post('/pump')
def control_pump():
    data = request.json or {}
    speed = int(data.get('speed', 0))
    speed = max(0, min(255, speed))
    cmd = f'PUMP:{speed}'
    ok = serial_mgr.send_command(cmd)
    if ok:
        _device_state['pump_speed'] = speed
    return jsonify({'ok': ok, 'speed': speed})


@bp.post('/command')
def raw_command():
    data = request.json or {}
    cmd = data.get('command', '').strip()
    if not cmd:
        return jsonify({'error': 'command required'}), 400
    ok = serial_mgr.send_command(cmd)
    return jsonify({'ok': ok, 'command': cmd})
