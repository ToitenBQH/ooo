from flask import Blueprint, request, jsonify, Response
from app.models import measurement as meas_model
from app.models import settings as settings_model

bp = Blueprint('measurements', __name__)


@bp.get('/')
def list_measurements():
    sid = request.args.get('session_id', type=int)
    if not sid:
        return jsonify({'error': 'session_id required'}), 400
    limit  = request.args.get('limit', type=int)
    offset = request.args.get('offset', 0, type=int)
    total  = meas_model.count_by_session(sid)
    rows   = meas_model.get_by_session(sid, limit, offset)
    return jsonify({'total': total, 'rows': rows})


@bp.get('/export')
def export_csv():
    sid = request.args.get('session_id', type=int)
    if not sid:
        return jsonify({'error': 'session_id required'}), 400
    sensor_names = settings_model.get_all()
    csv_data = meas_model.export_csv(sid, sensor_names)
    return Response(
        csv_data,
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename=session_{sid}.csv'}
    )


@bp.get('/latest')
def get_latest():
    rows = meas_model.get_latest(1)
    return jsonify(rows[0] if rows else {})
