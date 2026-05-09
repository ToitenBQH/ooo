from .database import get_db


def get_all():
    db = get_db()
    rows = db.execute("SELECT * FROM settings").fetchall()
    return {r['key']: r['value'] for r in rows}


def get(key, default=None):
    db = get_db()
    row = db.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row['value'] if row else default


def set(key, value):
    db = get_db()
    db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, str(value))
    )
    db.commit()


def set_many(data: dict):
    db = get_db()
    db.executemany(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        [(k, str(v)) for k, v in data.items()]
    )
    db.commit()
