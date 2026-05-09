from flask import Blueprint, request, jsonify
from app.models import project as proj_model

bp = Blueprint('projects', __name__)


@bp.get('/')
def list_projects():
    return jsonify(proj_model.get_all())


@bp.get('/<int:pid>')
def get_project(pid):
    p = proj_model.get_by_id(pid)
    if not p:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(p)


@bp.post('/')
def create_project():
    data = request.json or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'name required'}), 400
    pid = proj_model.create(name, data.get('description', ''))
    return jsonify({'id': pid, 'name': name}), 201


@bp.put('/<int:pid>')
def update_project(pid):
    data = request.json or {}
    proj_model.update(pid, data.get('name', ''), data.get('description', ''))
    return jsonify({'ok': True})


@bp.delete('/<int:pid>')
def delete_project(pid):
    proj_model.delete(pid)
    return jsonify({'ok': True})
