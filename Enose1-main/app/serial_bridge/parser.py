"""
Expected frame format from ESP32:
  DATA,<ch4>,<voc>,<h2>,<h2s>,<nh3>,<co>,<odor>,<temperature>,<humidity>

Sensors:
  ch4  → GPIO36 (ADC direct)
  voc  → GPIO39 (ADC direct)
  h2   → GPIO34 (ADC direct)
  h2s  → GPIO35 (ADC direct)
  nh3  → GPIO32 (ADC direct)
  co   → GPIO33 (ADC direct)
  odor → ADS1115 A0 (I2C)
  temp + hum → DHT22 on GPIO14
"""


def parse_frame(line: str) -> dict | None:
    try:
        parts = line.strip().split(',')
        if len(parts) < 10 or parts[0] != 'DATA':
            return None
        return {
            'mq1': float(parts[1]),   # CH4
            'mq2': float(parts[2]),   # VOC
            'mq3': float(parts[3]),   # H2
            'mq4': float(parts[4]),   # H2S
            'mq5': float(parts[5]),   # NH3
            'mq6': float(parts[6]),   # CO
            'mq7': float(parts[7]),   # Odor (ADS1115)
            'temperature': float(parts[8]),
            'humidity':    float(parts[9]),
        }
    except (ValueError, IndexError):
        return None
