import time
import random

from flask import Flask, render_template
from flask_socketio import SocketIO

# Try eventlet if installed, else fallback to threading mode
ASYNC_MODE = "threading"
eventlet = None
try:
    import eventlet
    eventlet.monkey_patch()
    ASYNC_MODE = "eventlet"
except Exception:
    eventlet = None
    ASYNC_MODE = "threading"

DEMO_MODE = False

app = Flask(__name__)
socketio = SocketIO(app, async_mode=ASYNC_MODE, cors_allowed_origins="*")

@app.route("/")
def index():
    return render_template("index.html")

# Forward BBBW -> Web (so real boards can plug in later)
@socketio.on("BBBW1Event")
def bbbw1(data): socketio.emit("Web_BBBW1Event", data)

@socketio.on("BBBW2Event")
def bbbw2(data): socketio.emit("Web_BBBW2Event", data)

@socketio.on("BBBW3Event")
def bbbw3(data): socketio.emit("Web_BBBW3Event", data)

@socketio.on("BBBW4Event")
def bbbw4(data): socketio.emit("Web_BBBW4Event", data)

# Web control for mute (demo: just update demo mute state)
demo_muted = 0

@socketio.on("ControlMuteAlarm")
def control_mute_alarm(data):
    global demo_muted
    try:
        demo_muted = 1 if int(data.get("mute", 0)) == 1 else 0
    except:
        demo_muted = 0

    # push update immediately to the web (so button changes)
    socketio.emit("Web_BBBW3Event", {"muted": demo_muted})

def demo_task():
    global demo_muted

    water = 85
    servo = 0
    dirty = 0
    watering = 0

    while True:
        # TOP LEFT demo: motion + force + servo + dirty
        motion = 1 if random.random() > 0.7 else 0
        force = random.uniform(0.00, 0.20)  # like "pressure value"
        servo = 1 if (motion == 1 and force > 0.10) else 0
        dirty = 1 if servo == 1 else 0

        socketio.emit("Web_BBBW1Event", {
            "motion": motion,
            "force": round(force, 3),
            "servo": servo,
            "dirty": dirty
        })

        # TOP RIGHT demo: UV
        uv = round(random.uniform(0.0, 11.0), 1)
        socketio.emit("Web_BBBW2Event", {"uv": uv})

        # BOTTOM LEFT demo: water + distance + alarm + muted
        # water goes down slowly, then up a bit
        water += random.uniform(-3.0, 1.0)
        if water < 0: water = 0
        if water > 100: water = 100

        distance = round(random.uniform(10.0, 120.0), 1)
        alarm = 1 if water <= 20 else 0

        socketio.emit("Web_BBBW3Event", {
            "water": int(water),
            "distance": distance,
            "alarm": alarm,
            "muted": demo_muted
        })

        # BOTTOM RIGHT demo: ENV + watering status
        temp = round(26 + random.uniform(-1.5, 2.5), 1)
        hum = round(60 + random.uniform(-10, 15), 0)
        watering = 1 if temp > 22 else 0

        socketio.emit("Web_BBBW4Event", {
            "temp": temp,
            "hum": hum,
            "watering": watering
        })

        time.sleep(1)

if __name__ == "__main__":
    if DEMO_MODE:
        socketio.start_background_task(demo_task)

    host = "192.168.72.207"
    port = 5000

    if eventlet is not None:
        eventlet.wsgi.server(eventlet.listen((host, port)), app)
    else:
        socketio.run(app, host=host, port=port, debug=False)
