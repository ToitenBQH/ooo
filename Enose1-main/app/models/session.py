from datetime import datetime
from .database import get_db


def get_all(project_id=None):
    db = get_db()
    if project_id:
        rows = db.execute(
            "SELECT * FROM sessions WHERE project_id=? ORDER BY created_at DESC",
            (project_id,)
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT s.*, p.name as project_name FROM sessions s "
            "LEFT JOIN projects p ON s.project_id=p.id ORDER BY s.created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_by_id(session_id):
    db = get_db()
    row = db.execute(
        "SELECT s.*, p.name as project_name FROM sessions s "
        "LEFT JOIN projects p ON s.project_id=p.id WHERE s.id=?",
        (session_id,)
    ).fetchone()
    return dict(row) if row else None


def create(project_id, name, label='', notes=''):
    db = get_db()
    cur = db.execute(
        "INSERT INTO sessions (project_id, name, label, notes) VALUES (?, ?, ?, ?)",
        (project_id, name, label, notes)
    )
    db.commit()
    return cur.lastrowid


def start(session_id):
    db = get_db()
    db.execute(
        "UPDATE sessions SET status='recording', started_at=? WHERE id=?",
        (datetime.utcnow().isoformat(), session_id)
    )
    db.commit()


def stop(session_id):
    db = get_db()
    db.execute(
        "UPDATE sessions SET status='completed', ended_at=? WHERE id=?",
        (datetime.utcnow().isoformat(), session_id)
    )
    db.commit()


def abort(session_id):
    db = get_db()
    db.execute(
        "UPDATE sessions SET status='aborted', ended_at=? WHERE id=?",
        (datetime.utcnow().isoformat(), session_id)
    )
    db.commit()


def get_active():
    db = get_db()
    row = db.execute(
        "SELECT * FROM sessions WHERE status='recording' ORDER BY started_at DESC LIMIT 1"
    ).fetchone()
    return dict(row) if row else None


def delete(session_id):
    db = get_db()
    db.execute("DELETE FROM sessions WHERE id=?", (session_id,))
    db.commit()
