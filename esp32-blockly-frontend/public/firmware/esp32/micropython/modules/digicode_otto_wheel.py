"""
DigiCodeOttoWheel - MicroPython implementation for OTTO Wheel wheeled robots

Copyright (c) 2025 DigiCode Project
Licensed under the MIT License

This module provides motion control for 2-wheel drive robots on ESP32.
"""

from machine import Pin, PWM
import time

# Wheel indices
WHEEL_LEFT = 0
WHEEL_RIGHT = 1

# Servo neutral position (stopped)
WHEEL_STOP = 90

# Speed constants
SPEED_FULL = 100
SPEED_MEDIUM = 50
SPEED_SLOW = 30

# PWM frequency for servos (Hz)
SERVO_FREQ = 50

# Pulse width range for continuous rotation servos (microseconds)
PULSE_MIN = 500   # Full reverse
PULSE_MAX = 2500  # Full forward
PULSE_STOP = 1500 # Stop


class DigiCodeOttoWheel:
    def __init__(self):
        self.servos = [None, None]
        self.pins = [0, 0]
        self.trims = [0, 0]

    def init(self, pin_left, pin_right):
        """Initialize servos with pin assignments"""
        self.pins[WHEEL_LEFT] = pin_left
        self.pins[WHEEL_RIGHT] = pin_right

        # Create PWM objects for each servo
        for i in range(2):
            self.servos[i] = PWM(Pin(self.pins[i]), freq=SERVO_FREQ)

        # Stop wheels
        self.stop()

    def set_trims(self, trim_l, trim_r):
        """Set calibration offsets for wheel balance"""
        self.trims[WHEEL_LEFT] = trim_l
        self.trims[WHEEL_RIGHT] = trim_r

    def _speed_to_duty(self, speed):
        """Convert speed (-100 to 100) to PWM duty cycle"""
        # Constrain speed
        speed = max(-100, min(100, speed))

        # Calculate pulse width based on speed
        if speed == 0:
            pulse_width = PULSE_STOP
        elif speed > 0:
            # Forward: map 1-100 to PULSE_STOP to PULSE_MAX
            pulse_width = PULSE_STOP + (PULSE_MAX - PULSE_STOP) * speed / 100
        else:
            # Backward: map -1 to -100 to PULSE_STOP to PULSE_MIN
            pulse_width = PULSE_STOP + (PULSE_MIN - PULSE_STOP) * abs(speed) / 100

        # Convert pulse width (µs) to duty cycle (0-1023 for ESP32)
        duty = int(pulse_width / 20000 * 1023)  # 20ms period at 50Hz
        return max(0, min(1023, duty))

    def _set_wheels(self, speed_left, speed_right):
        """Set individual wheel speeds (-100 to 100)"""
        if self.servos[WHEEL_LEFT] and self.servos[WHEEL_RIGHT]:
            # Apply trims
            adjusted_left = speed_left + self.trims[WHEEL_LEFT]
            adjusted_right = speed_right + self.trims[WHEEL_RIGHT]

            # Convert to duty cycles
            duty_left = self._speed_to_duty(adjusted_left)
            duty_right = self._speed_to_duty(adjusted_right)

            # Set PWM
            self.servos[WHEEL_LEFT].duty(duty_left)
            self.servos[WHEEL_RIGHT].duty(duty_right)

    def stop(self):
        """Stop both wheels"""
        self._set_wheels(0, 0)

    def forward(self, speed=SPEED_MEDIUM):
        """Move forward at specified speed (0-100)"""
        speed = max(0, min(100, speed))
        self._set_wheels(speed, speed)

    def backward(self, speed=SPEED_MEDIUM):
        """Move backward at specified speed (0-100)"""
        speed = max(0, min(100, speed))
        self._set_wheels(-speed, -speed)

    def turn_left(self, speed=SPEED_MEDIUM):
        """Turn left while moving forward"""
        speed = max(0, min(100, speed))
        # Left wheel slower, right wheel forward
        self._set_wheels(speed // 2, speed)

    def turn_right(self, speed=SPEED_MEDIUM):
        """Turn right while moving forward"""
        speed = max(0, min(100, speed))
        # Right wheel slower, left wheel forward
        self._set_wheels(speed, speed // 2)

    def spin_left(self, speed=SPEED_MEDIUM):
        """Spin in place to the left"""
        speed = max(0, min(100, speed))
        # Left wheel backward, right wheel forward
        self._set_wheels(-speed, speed)

    def spin_right(self, speed=SPEED_MEDIUM):
        """Spin in place to the right"""
        speed = max(0, min(100, speed))
        # Left wheel forward, right wheel backward
        self._set_wheels(speed, -speed)

    def forward_time(self, speed, duration_ms):
        """Move forward for a specific duration, then stop"""
        self.forward(speed)
        time.sleep_ms(duration_ms)
        self.stop()

    def backward_time(self, speed, duration_ms):
        """Move backward for a specific duration, then stop"""
        self.backward(speed)
        time.sleep_ms(duration_ms)
        self.stop()

    def turn_left_time(self, speed, duration_ms):
        """Turn left for a specific duration, then stop"""
        self.turn_left(speed)
        time.sleep_ms(duration_ms)
        self.stop()

    def turn_right_time(self, speed, duration_ms):
        """Turn right for a specific duration, then stop"""
        self.turn_right(speed)
        time.sleep_ms(duration_ms)
        self.stop()

    def home(self):
        """Stop and reset"""
        self.stop()

    def cleanup(self):
        """Deinitialize servos (free resources)"""
        for servo in self.servos:
            if servo:
                servo.deinit()
