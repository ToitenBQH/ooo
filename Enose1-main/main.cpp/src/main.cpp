#include <Arduino.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>

// ===== PIN CONFIG =====
#define PIN_CH4 36
#define PIN_VOC 39
#define PIN_H2  34
#define PIN_H2S 35
#define PIN_NH3 32
#define PIN_CO  33
#define PIN_DHT 14
#define SDA_PIN 21
#define SCL_PIN 22

#define RELAY1   26
#define RELAY2   27
#define MOSFET_PIN 23

// ===== HEARTBEAT =====
#define HEARTBEAT_TIMEOUT 5000   // 5 giây

// ===== OBJECTS =====
DHT dht(PIN_DHT, DHT22);
Adafruit_ADS1115 ads;

// ===== STATE =====
bool valve1 = false;
bool valve2 = false;
int pump_speed = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastPrint = 0;
const unsigned long SEND_INTERVAL = 1000;

// ===== ADC FILTER =====
int readADC(int pin) {
    analogRead(pin);
    delayMicroseconds(50);
    long sum = 0;
    for (int i = 0; i < 10; i++) {
        sum += analogRead(pin);
        delayMicroseconds(200);
    }
    return sum / 10;
}

// ===== ACTUATOR CONTROL =====
void updateValves() {
    digitalWrite(RELAY1, valve1 ? HIGH : LOW);
    digitalWrite(RELAY2, valve2 ? HIGH : LOW);
}

void setPumpSpeed(int speed) {
    speed = constrain(speed, 0, 255);
    pump_speed = speed;
    if (speed == 0) {
        ledcWrite(0, 0);
    } else {
        ledcWrite(0, speed);
    }
}

void turnOffAll() {
    if (valve1 || valve2 || pump_speed != 0) {
        valve1 = false;
        valve2 = false;
        setPumpSpeed(0);
        updateValves();
        Serial.println("WATCHDOG: All actuators OFF due to lost heartbeat");
    }
}

// ===== SERIAL COMMAND PARSING =====
void handleSerial() {
    if (!Serial.available()) return;
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() == 0) return;

    // Reset heartbeat khi có bất kỳ lệnh nào (kể cả PING)
    lastHeartbeat = millis();

    if (input == "PING") {
        // Chỉ reset timer, không làm gì thêm
        return;
    }
    else if (input.equalsIgnoreCase("VALVE1:ON")) {
        valve1 = true;
        updateValves();
        Serial.println("VALVE1:ON");
    }
    else if (input.equalsIgnoreCase("VALVE1:OFF")) {
        valve1 = false;
        updateValves();
        Serial.println("VALVE1:OFF");
    }
    else if (input.equalsIgnoreCase("VALVE2:ON")) {
        valve2 = true;
        updateValves();
        Serial.println("VALVE2:ON");
    }
    else if (input.equalsIgnoreCase("VALVE2:OFF")) {
        valve2 = false;
        updateValves();
        Serial.println("VALVE2:OFF");
    }
    else if (input.startsWith("PUMP:")) {
        int speed = input.substring(5).toInt();
        setPumpSpeed(speed);
        Serial.printf("PUMP:%d\n", speed);
    }
    // Legacy commands
    else if (input == "1") { valve1 = true; updateValves(); Serial.println("VALVE1:ON"); }
    else if (input == "2") { valve1 = false; updateValves(); Serial.println("VALVE1:OFF"); }
    else if (input == "3") { valve2 = true; updateValves(); Serial.println("VALVE2:ON"); }
    else if (input == "4") { valve2 = false; updateValves(); Serial.println("VALVE2:OFF"); }
    else if (input == "0") { setPumpSpeed(0); }
    else {
        float voltage = input.toFloat();
        if (voltage >= 5 && voltage <= 12) {
            int pwm = map(voltage * 10, 50, 120, 100, 255);
            setPumpSpeed(pwm);
        }
    }
}

// ===== READ ODOR =====
int readOdor() {
    if (!ads.begin(0x48)) return 0;
    int16_t raw = ads.readADC_SingleEnded(0);
    if (raw < 0) raw = 0;
    return raw;
}

// ===== SETUP =====
void setup() {
    Serial.begin(115200);
    delay(500);

    pinMode(RELAY1, OUTPUT);
    pinMode(RELAY2, OUTPUT);
    digitalWrite(RELAY1, LOW);
    digitalWrite(RELAY2, LOW);

    ledcSetup(0, 1000, 8);
    ledcAttachPin(MOSFET_PIN, 0);
    ledcWrite(0, 0);

    analogReadResolution(12);
    analogSetPinAttenuation(PIN_CH4, ADC_11db);
    analogSetPinAttenuation(PIN_VOC, ADC_11db);
    analogSetPinAttenuation(PIN_H2,  ADC_11db);
    analogSetPinAttenuation(PIN_H2S, ADC_11db);
    analogSetPinAttenuation(PIN_NH3, ADC_11db);
    analogSetPinAttenuation(PIN_CO,  ADC_11db);

    dht.begin();
    Wire.begin(SDA_PIN, SCL_PIN);
    if (ads.begin(0x48)) {
        ads.setGain(GAIN_ONE);
        Serial.println("ADS1115 OK");
    } else {
        Serial.println("ADS1115 FAIL");
    }

    Serial.println("Warming up sensors (30s)...");
    delay(30000);
    Serial.println("SYSTEM READY");
    Serial.println("Commands: VALVE1:ON/OFF, VALVE2:ON/OFF, PUMP:0-255");
    
    lastHeartbeat = millis();
}

// ===== LOOP =====
void loop() {
    handleSerial();

    // Kiểm tra heartbeat timeout
    if (millis() - lastHeartbeat >= HEARTBEAT_TIMEOUT) {
        turnOffAll();
        lastHeartbeat = millis(); // tránh gọi lại liên tục
    }

    if (millis() - lastPrint >= SEND_INTERVAL) {
        lastPrint = millis();

        int mq1 = readADC(PIN_CH4);
        int mq2 = readADC(PIN_VOC);
        int mq3 = readADC(PIN_H2);
        int mq4 = readADC(PIN_H2S);
        int mq5 = readADC(PIN_NH3);
        int mq6 = readADC(PIN_CO);
        int mq7 = readOdor();

        float temp = dht.readTemperature();
        float hum  = dht.readHumidity();
        if (isnan(temp)) temp = 0;
        if (isnan(hum))  hum  = 0;

        Serial.printf("DATA,%d,%d,%d,%d,%d,%d,%d,%.1f,%.1f\n",
                      mq1, mq2, mq3, mq4, mq5, mq6, mq7, temp, hum);
    }
}