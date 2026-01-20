$(document).ready(function () {
  var socket = io.connect("http://" + location.hostname + ":5000");

  function nowTime() { return new Date().toLocaleTimeString(); }

  function setConnected(ok) {
    $("#connDot").toggleClass("ok", ok);
    $("#connDot").toggleClass("bad", !ok);
    $("#connText").text(ok ? "Connected" : "Disconnected");
  }

  function clamp(n, a, b) {
    n = Number(n);
    if (isNaN(n)) return a;
    if (n < a) return a;
    if (n > b) return b;
    return n;
  }

  // ---------- UV bulb ----------
  function setBulbFromUV(uv) {
    uv = Number(uv);
    if (isNaN(uv)) {
      $("#uvStatus").text("--");
      $("#bulbImg").removeClass("on").addClass("off");
      $("#bulbGlow").removeClass("on").addClass("off");
      return;
    }

    // simple rule: UV >= 3 => "ON"
    var on = uv >= 3.0;

    $("#uvStatus").text(on ? "UV DETECTED" : "LOW UV");
    $("#bulbImg").toggleClass("on", on).toggleClass("off", !on);
    $("#bulbGlow").toggleClass("on", on).toggleClass("off", !on);

    // glow strength based on UV (0..11)
    var p = clamp(uv / 11.0, 0, 1);
    $("#bulbGlow").css("opacity", (0.10 + 0.80 * p).toFixed(2));
  }

  // ---------- Socket connection ----------
  socket.on("connect", function () { setConnected(true); });
  socket.on("disconnect", function () { setConnected(false); });

  // =========================
  // TOP LEFT: Motion + Force + Servo + Filter + Tank Tint
  // expects:
  //  motion: 0/1
  //  force: number (0..1 or any)
  //  servo: 0/1
  //  dirty: optional 0/1 (if not provided, servo==1 treated as dirty)
  // =========================
  socket.on("Web_BBBW1Event", function (d) {
    if (d.motion !== undefined) {
      $("#motionText").text(Number(d.motion) === 1 ? "DETECTED" : "NO MOTION");
    }

    if (d.force !== undefined) {
      // show raw value (you asked "value")
      var f = Number(d.force);
      if (isNaN(f)) {
        $("#forceVal").text("--");
      } else {
        $("#forceVal").text(f.toFixed(3));
      }
    }

    var servo = 0;
    if (d.servo !== undefined) servo = Number(d.servo);

    if (!isNaN(servo)) {
      $("#servoText").text(servo === 1 ? "ACTIVE" : "IDLE");

      // filter animation swap
      if (servo === 1) {
        $("#filterAnim").attr("src", "../static/image/filter.gif");
      } else {
        $("#filterAnim").attr("src", "../static/image/filter.png");
      }
    }

    // tank tint (dirty if dirty==1, otherwise use servo==1)
    var dirty = null;
    if (d.dirty !== undefined) dirty = Number(d.dirty);

    var isDirty = false;
    if (dirty !== null && !isNaN(dirty)) {
      isDirty = (dirty === 1);
    } else {
      isDirty = (servo === 1);
    }

    $("#tankTint").removeClass("clean dirty").addClass(isDirty ? "dirty" : "clean");

    $("#t1").text(nowTime());
  });

  // =========================
  // TOP RIGHT: UV
  // expects: uv
  // =========================
  socket.on("Web_BBBW2Event", function (d) {
    if (d.uv !== undefined) {
      $("#uv").text(d.uv);
      setBulbFromUV(d.uv);
    }
    $("#t2").text(nowTime());
  });

  // =========================
  // BOTTOM LEFT: Water tank + IR distance + alarm + mute
  // expects: water (0..100), distance, alarm 0/1, muted 0/1
  // =========================
  socket.on("Web_BBBW3Event", function (d) {
    if (d.water !== undefined) {
      var w = clamp(d.water, 0, 100);
      $("#water").text(Math.round(w));
      $("#waterBar").css("width", Math.round(w) + "%");
    }

    if (d.distance !== undefined && d.distance !== null) {
      $("#distance").text(Number(d.distance).toFixed(1));
    } else {
      $("#distance").text("--");
    }

    if (d.alarm !== undefined) {
      $("#alarmText").text(Number(d.alarm) === 1 ? "ON (LOW WATER)" : "OFF");
    }

    if (d.muted !== undefined) {
      var m = Number(d.muted);
      $("#muteText").text(m === 1 ? "YES" : "NO");
      $("#btnMute").text(m === 1 ? "Unmute Alarm" : "Mute Alarm");
    }

    $("#t3").text(nowTime());
  });

  // mute toggle -> server
  $("#btnMute").click(function () {
    var txt = $("#btnMute").text().toLowerCase();
    var currentlyMuted = (txt.indexOf("unmute") >= 0); // button says Unmute => currently muted
    var newMute = currentlyMuted ? 0 : 1;
    socket.emit("ControlMuteAlarm", { mute: newMute });
  });

  // =========================
  // BOTTOM RIGHT: OLED + ENV + Buzz (watering)
  // expects: temp, hum, watering (or buzz)
  // =========================
  socket.on("Web_BBBW4Event", function (d) {
    if (d.temp !== undefined) $("#envTemp").text(d.temp);
    if (d.hum !== undefined) $("#envHum").text(d.hum);

    var watering = null;
    if (d.watering !== undefined) watering = Number(d.watering);
    else if (d.buzz !== undefined) watering = Number(d.buzz);

    if (watering !== null && !isNaN(watering)) {
      if (watering === 1) {
        $("#wateringText").text("WATERING ✅");
        $("#waterAnim").attr("src", "../static/image/plant.gif");
      } else {
        $("#wateringText").text("IDLE");
        $("#waterAnim").attr("src", "../static/image/plant.png");
      }
    }

    $("#t4").text(nowTime());
  });
});
