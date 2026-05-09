import csv
import io
from .database import get_db

COLUMNS = ['id', 'session_id', 'timestamp', 'mq1', 'mq2', 'mq3', 'mq4',
           'mq5', 'mq6', 'mq7', 'temperature', 'humidity',
           'pump_speed', 'valve1', 'valve2']


def bulk_insert(session_id, rows):
    """rows: list of dicts with sensor keys"""
    db = get_db()
    db.executemany(
        "INSERT INTO measurements (session_id, mq1, mq2, mq3, mq4, mq5, mq6, mq7, "
        "temperature, humidity, pump_speed, valve1, valve2) "
        "VALUES (:session_id, :mq1, :mq2, :mq3, :mq4, :mq5, :mq6, :mq7, "
        ":temperature, :humidity, :pump_speed, :valve1, :valve2)",
        [dict(session_id=session_id, **r) for r in rows]
    )
    db.commit()


def insert_one(session_id, data: dict):
    db = get_db()
    db.execute(
        "INSERT INTO measurements (session_id, mq1, mq2, mq3, mq4, mq5, mq6, mq7, "
        "temperature, humidity, pump_speed, valve1, valve2) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (session_id,
         data.get('mq1'), data.get('mq2'), data.get('mq3'), data.get('mq4'),
         data.get('mq5'), data.get('mq6'), data.get('mq7'),
         data.get('temperature'), data.get('humidity'),
         data.get('pump_speed', 0), data.get('valve1', 0), data.get('valve2', 0))
    )
    db.commit()


def get_by_session(session_id, limit=None, offset=0):
    db = get_db()
    sql = "SELECT * FROM measurements WHERE session_id=? ORDER BY timestamp ASC"
    params = [session_id]
    if limit:
        sql += " LIMIT ? OFFSET ?"
        params += [limit, offset]
    rows = db.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def count_by_session(session_id):
    db = get_db()
    row = db.execute(
        "SELECT COUNT(*) as cnt FROM measurements WHERE session_id=?", (session_id,)
    ).fetchone()
    return row['cnt'] if row else 0


def export_csv(session_id, sensor_names=None):
    rows = get_by_session(session_id)
    output = io.StringIO()
    if not rows:
        return output.getvalue()
    # Build header with custom sensor names
    header = ['id', 'timestamp']
    sn = sensor_names or {}
    for i in range(1, 8):
        header.append(sn.get(f'sensor{i}_name', f'MQ-{i}'))
    header += ['Temperature (°C)', 'Humidity (%)', 'Pump Speed', 'Valve 1', 'Valve 2']
    writer = csv.writer(output)
    writer.writerow(header)
    for r in rows:
        writer.writerow([
            r['id'], r['timestamp'],
            r['mq1'], r['mq2'], r['mq3'], r['mq4'], r['mq5'], r['mq6'], r['mq7'],
            r['temperature'], r['humidity'], r['pump_speed'], r['valve1'], r['valve2']
        ])
    return output.getvalue()


def get_latest(n=1):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM measurements ORDER BY id DESC LIMIT ?", (n,)
    ).fetchall()
    return [dict(r) for r in rows]
