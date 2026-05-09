from .database import get_db


def get_all():
    db = get_db()
    rows = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def get_by_id(project_id):
    db = get_db()
    row = db.execute("SELECT * FROM projects WHERE id=?", (project_id,)).fetchone()
    return dict(row) if row else None


def create(name, description=''):
    db = get_db()
    cur = db.execute(
        "INSERT INTO projects (name, description) VALUES (?, ?)",
        (name, description)
    )
    db.commit()
    return cur.lastrowid


def update(project_id, name, description=''):
    db = get_db()
    db.execute(
        "UPDATE projects SET name=?, description=? WHERE id=?",
        (name, description, project_id)
    )
    db.commit()


def delete(project_id):
    db = get_db()
    db.execute("DELETE FROM projects WHERE id=?", (project_id,))
    db.commit()
