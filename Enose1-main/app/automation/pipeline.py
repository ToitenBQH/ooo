"""
Automation Pipeline State Machine

States:
  IDLE -> PURGE -> WAIT -> SAMPLE -> FLUSH -> IDLE

During each state, the appropriate serial commands are sent to
control valves and pump speed.
"""
import threading
import time
from flask import current_app


class AutomationEngine:
    STATES = ['IDLE', 'PURGE', 'WAIT', 'SAMPLE', 'FLUSH']

    def __init__(self, serial_send_fn, socketio, session_start_fn, session_stop_fn):
        self._send = serial_send_fn
        self._sio = socketio
        self._session_start = session_start_fn
        self._session_stop = session_stop_fn
        self._thread = None
        self._stop_event = threading.Event()
        self.state = 'IDLE'
        self.config = {}
        self.current_session_id = None
        self.elapsed = 0

    def configure(self, cfg: dict):
        self.config = cfg

    def start(self, session_id, config=None):
        if self._thread and self._thread.is_alive():
            return False, 'Pipeline already running'
        if config:
            self.config = config
        self.current_session_id = session_id
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        return True, 'Pipeline started'

    def stop(self):
        self._stop_event.set()
        self.state = 'IDLE'
        self._emit_status()

    def is_running(self):
        return self._thread is not None and self._thread.is_alive()

    def _emit_status(self, step_elapsed=0, step_total=0):
        self._sio.emit('pipeline_status', {
            'state': self.state,
            'session_id': self.current_session_id,
            'step_elapsed': step_elapsed,
            'step_total': step_total,
            'is_running': self.is_running(),
        }, namespace='/live')

    def _wait(self, seconds, label):
        """Wait `seconds` while emitting status updates every second."""
        for i in range(int(seconds)):
            if self._stop_event.is_set():
                return False
            self._emit_status(i, seconds)
            time.sleep(1)
        return True

    def _run(self):
        cfg = self.config
        purge_dur   = int(cfg.get('purge_duration', 30))
        sample_delay = int(cfg.get('sample_delay', 5))
        sample_dur  = int(cfg.get('sample_duration', 60))
        flush_dur   = int(cfg.get('flush_duration', 20))
        pump_speed  = int(cfg.get('pump_speed', 200))

        # --- PURGE: Open valve1 (inert gas), run pump ---
        self.state = 'PURGE'
        self._send('VALVE1:ON')
        self._send('VALVE2:OFF')
        self._send(f'PUMP:{pump_speed}')
        if not self._wait(purge_dur, 'PURGE'):
            self._finish()
            return

        # --- WAIT: Stop pump, close valves, let sensors stabilize ---
        self.state = 'WAIT'
        self._send('PUMP:0')
        self._send('VALVE1:OFF')
        if not self._wait(sample_delay, 'WAIT'):
            self._finish()
            return

        # --- SAMPLE: Open valve2 (sample chamber), start pump, start recording ---
        self.state = 'SAMPLE'
        self._send('VALVE2:ON')
        self._send(f'PUMP:{pump_speed}')
        self._session_start(self.current_session_id)
        if not self._wait(sample_dur, 'SAMPLE'):
            self._finish()
            return

        # --- FLUSH: Close valve2, purge with inert gas again ---
        self.state = 'FLUSH'
        self._session_stop(self.current_session_id)
        self._send('VALVE2:OFF')
        self._send('VALVE1:ON')
        if not self._wait(flush_dur, 'FLUSH'):
            self._finish()
            return

        self._finish()

    def _finish(self):
        self._send('VALVE1:OFF')
        self._send('VALVE2:OFF')
        self._send('PUMP:0')
        self.state = 'IDLE'
        self._emit_status()


_engine: AutomationEngine = None


def get_engine() -> AutomationEngine:
    return _engine


def init_engine(serial_send_fn, socketio, session_start_fn, session_stop_fn):
    global _engine
    _engine = AutomationEngine(serial_send_fn, socketio, session_start_fn, session_stop_fn)
    return _engine
