import sqlite3
import os
from flask import current_app, g

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    label       TEXT,
    status      TEXT DEFAULT 'idle',
    started_at  DATETIME,
    ended_at    DATETIME,
    notes       TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS measurements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
    mq1         REAL, mq2  REAL, mq3  REAL, mq4  REAL,
    mq5         REAL, mq6  REAL, mq7  REAL,
    temperature REAL, humidity REAL,
    pump_speed  INTEGER DEFAULT 0,
    valve1      INTEGER DEFAULT 0,
    valve2      INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS automation_configs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    purge_duration  INTEGER DEFAULT 30,
    sample_delay    INTEGER DEFAULT 5,
    sample_duration INTEGER DEFAULT 60,
    flush_duration  INTEGER DEFAULT 20,
    pump_speed      INTEGER DEFAULT 200,
    valve1_on_purge INTEGER DEFAULT 1,
    valve2_on_sample INTEGER DEFAULT 1,
    is_default      INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS device_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
    command     TEXT NOT NULL,
    response    TEXT,
    session_id  INTEGER
);
"""

DEFAULT_SETTINGS = {
    'com_port': '',
    'baud_rate': '115200',
    'setup_done': '0',
    'sensor1_name': 'MQ-2',
    'sensor2_name': 'MQ-3',
    'sensor3_name': 'MQ-4',
    'sensor4_name': 'MQ-5',
    'sensor5_name': 'MQ-6',
    'sensor6_name': 'MQ-8',
    'sensor7_name': 'MQ-135',
    'valve1_name': 'Van Khí Trơ',
    'valve2_name': 'Van Buồng Mẫu',
    'pump_name': 'Bơm Mẫu',
}


def get_db():
    if 'db' not in g:
        db_path = current_app.config['DATABASE']
        g.db = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db(app):
    with app.app_context():
        db_path = app.config['DATABASE']
        conn = sqlite3.connect(db_path)
        conn.executescript(SCHEMA)
        # Insert default settings if not exist
        for key, value in DEFAULT_SETTINGS.items():
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
                (key, value)
            )
        conn.commit()
        conn.close()
