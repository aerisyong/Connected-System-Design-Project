import time
import board
import adafruit_bme680
import Adafruit_BBIO.GPIO as GPIO

#Create sensor object, communicating over the board's default I2C bus
i2c = board.I2C()
bme680 = adafruit_bme680.Adafruit_BME680_I2C(i2c, 0x77)

#Singapore mean pressure (hPa) at sea level
bme680.sea_level_pressure = 1008.5

#Calibrate the temperature sensor value
temperature_offset = -5

GPIO.setup("P9_41", GPIO.IN)

while True:
    print("\nTemperature: %0.1f C" % (bme680.temperature + temperature_offset))
    print("Gas: %d ohm" % bme680.gas)
    print("Humidity: %0.1f %%" % bme680.relative_humidity)
    print("Pressure: %0.3f hPa" % bme680.pressure)
    print("Altitude = %0.2f meters" % bme680.altitude)
    time.sleep(1)
    
    if GPIO.input("P9_41"):
        print("Motion is Detected")
    else:
        print("No Motion is Detected")
    time.sleep(0.3)

