from flask import Blueprint, request, jsonify
from app.models import session as sess_model
from app.events import socket_events

bp = Blueprint('sessions', __name__)


@bp.get('/')
def list_sessions():
    pid = request.args.get('project_id', type=int)
    return jsonify(sess_model.get_all(pid))


@bp.get('/<int:sid>')
def get_session(sid):
    s = sess_model.get_by_id(sid)
    if not s:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(s)


@bp.post('/')
def create_session():
    data = request.json or {}
    if not data.get('project_id') or not data.get('name'):
        return jsonify({'error': 'project_id and name required'}), 400
    sid = sess_model.create(
        data['project_id'], data['name'],
        data.get('label', ''), data.get('notes', '')
    )
    return jsonify({'id': sid}), 201


@bp.post('/<int:sid>/start')
def start_session(sid):
    sess_model.start(sid)
    socket_events.set_active_session(sid)
    return jsonify({'ok': True, 'session_id': sid})


@bp.post('/<int:sid>/stop')
def stop_session(sid):
    sess_model.stop(sid)
    if socket_events.get_active_session() == sid:
        socket_events.set_active_session(None)
    return jsonify({'ok': True})


@bp.post('/<int:sid>/abort')
def abort_session(sid):
    sess_model.abort(sid)
    if socket_events.get_active_session() == sid:
        socket_events.set_active_session(None)
    return jsonify({'ok': True})


@bp.delete('/<int:sid>')
def delete_session(sid):
    sess_model.delete(sid)
    return jsonify({'ok': True})


@bp.get('/active')
def get_active():
    s = sess_model.get_active()
    return jsonify(s or {})
