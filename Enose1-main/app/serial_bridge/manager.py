import threading
import time
import serial
import serial.tools.list_ports

_lock = threading.Lock()
_serial: serial.Serial = None
_read_thread: threading.Thread = None
_heartbeat_thread: threading.Thread = None
_running = False
_on_data_cb = None
_on_status_cb = None
_state = {'connected': False, 'port': '', 'baud': 115200}


def list_ports():
    ports = serial.tools.list_ports.comports()
    return [{'port': p.device, 'desc': p.description} for p in sorted(ports)]


def get_state():
    return dict(_state)


def connect(port, baud=115200, on_data=None, on_status=None):
    global _serial, _read_thread, _heartbeat_thread, _running, _on_data_cb, _on_status_cb

    disconnect()

    _on_data_cb = on_data
    _on_status_cb = on_status

    try:
        _serial = serial.Serial(port, baud, timeout=1)
        print(f"✅ Connected to {port} at {baud}")
        time.sleep(2)
        _state.update({'connected': True, 'port': port, 'baud': baud})
        _running = True
        _read_thread = threading.Thread(target=_read_loop, daemon=True)
        _read_thread.start()
        _heartbeat_thread = threading.Thread(target=_heartbeat_loop, daemon=True)
        _heartbeat_thread.start()
        print("✅ Read thread and heartbeat thread started")
        _notify_status('connected')
        return True, 'Connected'
    except Exception as e:
        print(f"❌ Connect failed: {e}")
        _state['connected'] = False
        return False, str(e)


def disconnect():
    global _serial, _running
    print("Disconnecting...")
    _running = False
    if _serial and _serial.is_open:
        try:
            _serial.close()
        except Exception:
            pass
    _serial = None
    _state['connected'] = False
    _notify_status('disconnected')


def send_command(cmd: str):
    with _lock:
        if _serial and _serial.is_open:
            try:
                _serial.write((cmd.strip() + '\n').encode())
                print(f"📤 Sent: {cmd}")
                return True
            except Exception as e:
                print(f"Send error: {e}")
                return False
    return False


def _notify_status(s):
    if _on_status_cb:
        try:
            _on_status_cb(s)
        except Exception:
            pass


def _heartbeat_loop():
    """Gửi PING mỗi 3 giây khi kết nối"""
    while _running and _serial and _serial.is_open:
        time.sleep(3)
        if _serial and _serial.is_open:
            try:
                _serial.write(b'PING\n')
                #print("💓 Heartbeat sent")
            except Exception:
                pass


def _read_loop():
    print("🔄 Read loop started")
    while _running and _serial and _serial.is_open:
        try:
            raw = _serial.readline()
            if not raw:
                continue
            line = raw.decode('utf-8', errors='replace').strip()
            #print(f"📥 RAW: {line}")
            if line.startswith('DATA,'):
                parts = line.split(',')
                if len(parts) >= 10:
                    try:
                        parsed = {
                            'mq1': float(parts[1]),
                            'mq2': float(parts[2]),
                            'mq3': float(parts[3]),
                            'mq4': float(parts[4]),
                            'mq5': float(parts[5]),
                            'mq6': float(parts[6]),
                            'mq7': float(parts[7]),
                            'temperature': float(parts[8]),
                            'humidity': float(parts[9]),
                        }
                        #print(f"✅ Emit data: {parsed}")
                        from app import socketio
                        socketio.emit('sensor_data', parsed, namespace='/live')
                    except Exception as e:
                        print(f"Parse error: {e}")
            # Không cần xử lý PING ở đây, vì ESP32 sẽ nhận và reset timer
        except Exception as e:
            print(f"Read loop error: {e}")
    print("🔄 Read loop ended")