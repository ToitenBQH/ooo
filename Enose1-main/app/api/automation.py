from flask import Blueprint, request, jsonify
from app.automation import pipeline
from app.models import session as sess_model

bp = Blueprint('automation', __name__)


@bp.get('/status')
def status():
    eng = pipeline.get_engine()
    if not eng:
        return jsonify({'state': 'IDLE', 'is_running': False})
    return jsonify({
        'state': eng.state,
        'is_running': eng.is_running(),
        'session_id': eng.current_session_id,
        'config': eng.config,
    })


@bp.post('/start')
def start():
    data = request.json or {}
    eng = pipeline.get_engine()
    if not eng:
        return jsonify({'error': 'Engine not initialized'}), 500

    # Create or use existing session
    project_id = data.get('project_id')
    session_id = data.get('session_id')
    if not session_id and project_id:
        session_name = data.get('session_name', 'Auto Session')
        session_id = sess_model.create(project_id, session_name, data.get('label', ''))

    if not session_id:
        return jsonify({'error': 'session_id or project_id required'}), 400

    cfg = {
        'purge_duration':  data.get('purge_duration', 30),
        'sample_delay':    data.get('sample_delay', 5),
        'sample_duration': data.get('sample_duration', 60),
        'flush_duration':  data.get('flush_duration', 20),
        'pump_speed':      data.get('pump_speed', 200),
    }
    ok, msg = eng.start(session_id, cfg)
    return jsonify({'ok': ok, 'message': msg, 'session_id': session_id})


@bp.post('/stop')
def stop():
    eng = pipeline.get_engine()
    if eng:
        eng.stop()
    return jsonify({'ok': True})
