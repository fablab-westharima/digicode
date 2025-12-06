"""
DigiCodeOttoNinja - MicroPython implementation for OTTO Ninja quadruped robots

Copyright (c) 2025 DigiCode Project
Licensed under the MIT License

This module provides motion control for 4-legged robots with 8 servos on ESP32.
"""

from machine import Pin, PWM
import time
import math

# Servo indices (4 legs, 2 joints each)
LEG_FL_HIP = 0      # Front Left Hip
LEG_FL_ANKLE = 1    # Front Left Ankle
LEG_FR_HIP = 2      # Front Right Hip
LEG_FR_ANKLE = 3    # Front Right Ankle
LEG_BL_HIP = 4      # Back Left Hip
LEG_BL_ANKLE = 5    # Back Left Ankle
LEG_BR_HIP = 6      # Back Right Hip
LEG_BR_ANKLE = 7    # Back Right Ankle

# Default neutral position
NEUTRAL_POSITION = 90

# PWM frequency for servos (Hz)
SERVO_FREQ = 50

# Pulse width range for SG90 servos (microseconds)
PULSE_MIN = 500
PULSE_MAX = 2500


class DigiCodeOttoNinja:
    def __init__(self):
        self.servos = [None] * 8
        self.pins = [0] * 8
        self.trims = [0] * 8
        self.current_angles = [NEUTRAL_POSITION] * 8

    def init(self, pin_flh, pin_fla, pin_frh, pin_fra,
             pin_blh, pin_bla, pin_brh, pin_bra):
        """Initialize servos with pin assignments"""
        self.pins[LEG_FL_HIP] = pin_flh
        self.pins[LEG_FL_ANKLE] = pin_fla
        self.pins[LEG_FR_HIP] = pin_frh
        self.pins[LEG_FR_ANKLE] = pin_fra
        self.pins[LEG_BL_HIP] = pin_blh
        self.pins[LEG_BL_ANKLE] = pin_bla
        self.pins[LEG_BR_HIP] = pin_brh
        self.pins[LEG_BR_ANKLE] = pin_bra

        # Create PWM objects for each servo
        for i in range(8):
            self.servos[i] = PWM(Pin(self.pins[i]), freq=SERVO_FREQ)

        # Move to home position
        self.home()

    def set_trims(self, trim_flh, trim_fla, trim_frh, trim_fra,
                  trim_blh, trim_bla, trim_brh, trim_bra):
        """Set calibration offsets for servos"""
        self.trims[LEG_FL_HIP] = trim_flh
        self.trims[LEG_FL_ANKLE] = trim_fla
        self.trims[LEG_FR_HIP] = trim_frh
        self.trims[LEG_FR_ANKLE] = trim_fra
        self.trims[LEG_BL_HIP] = trim_blh
        self.trims[LEG_BL_ANKLE] = trim_bla
        self.trims[LEG_BR_HIP] = trim_brh
        self.trims[LEG_BR_ANKLE] = trim_bra

    def _angle_to_duty(self, angle):
        """Convert angle (0-180) to PWM duty cycle"""
        pulse_width = PULSE_MIN + (PULSE_MAX - PULSE_MIN) * angle / 180
        duty = int(pulse_width / 20000 * 1023)
        return max(0, min(1023, duty))

    def _set_servo(self, servo_index, angle):
        """Set servo to specified angle with trim applied"""
        if 0 <= servo_index < 8 and self.servos[servo_index]:
            adjusted = max(0, min(180, angle + self.trims[servo_index]))
            duty = self._angle_to_duty(adjusted)
            self.servos[servo_index].duty(duty)
            self.current_angles[servo_index] = angle

    def home(self):
        """Move to neutral standing position"""
        for i in range(8):
            self._set_servo(i, NEUTRAL_POSITION)
        time.sleep_ms(200)

    def move_servos(self, duration_ms, target_angles):
        """Move all servos to target positions smoothly"""
        if duration_ms <= 0:
            duration_ms = 1

        initial_angles = self.current_angles.copy()
        start_time = time.ticks_ms()
        end_time = start_time + duration_ms

        while time.ticks_ms() < end_time:
            elapsed = time.ticks_diff(time.ticks_ms(), start_time)
            progress = min(1.0, elapsed / duration_ms)

            # Cubic easing in-out
            if progress < 0.5:
                eased = 4 * progress ** 3
            else:
                f = 2 * progress - 2
                eased = 1 + f ** 3 / 2

            # Interpolate angles
            for i in range(8):
                angle = int(initial_angles[i] + (target_angles[i] - initial_angles[i]) * eased)
                self._set_servo(i, angle)

            time.sleep_ms(10)

        # Ensure final position
        for i in range(8):
            self._set_servo(i, target_angles[i])

    def _oscillate_servos(self, amplitude, offset, phase, cycle_count, period_ms):
        """Oscillate servos with specified parameters"""
        start_time = time.ticks_ms()
        total_time = cycle_count * period_ms

        while time.ticks_diff(time.ticks_ms(), start_time) < total_time:
            elapsed = time.ticks_diff(time.ticks_ms(), start_time)
            t = (elapsed % period_ms) / period_ms

            for i in range(8):
                phase_shift = phase[i] / 360.0
                angle_rad = 2.0 * math.pi * (t + phase_shift)
                angle = offset[i] + int(amplitude[i] * math.sin(angle_rad))
                self._set_servo(i, angle)

            time.sleep_ms(10)

    # === LOCOMOTION ===

    def walk(self, steps=2, period=1000, direction=1):
        """Walk forward (direction=1) or backward (direction=-1)"""
        amplitude = [15, 20, 15, 20, 15, 20, 15, 20]
        offset = [90, 90, 90, 90, 90, 90, 90, 90]
        phase = [0, 90, 180, 270, 180, 270, 0, 90]

        if direction == -1:
            phase = [(p + 180) % 360 for p in phase]

        self._oscillate_servos(amplitude, offset, phase, steps, period)
        self.home()

    def turn(self, steps=2, period=1000, direction=1):
        """Turn left (direction=1) or right (direction=-1)"""
        amplitude = [20, 15, 20, 15, 20, 15, 20, 15]
        offset = [90, 90, 90, 90, 90, 90, 90, 90]

        if direction == 1:  # Left
            phase = [0, 90, 90, 180, 180, 270, 270, 0]
        else:  # Right
            phase = [90, 180, 0, 90, 270, 0, 180, 270]

        self._oscillate_servos(amplitude, offset, phase, steps, period)
        self.home()

    def trot(self, steps=2, period=600):
        """Fast walk"""
        self.walk(steps, period, 1)

    def crawl(self, steps=2, period=1500):
        """Slow walk"""
        self.walk(steps, period, 1)

    # === GESTURES ===

    def push_up(self, steps=1, period=1000):
        """Push-up motion"""
        target = [90, 60, 90, 60, 90, 60, 90, 60]

        for _ in range(steps):
            self.move_servos(period // 2, target)
            self.home()

    def lateral(self, steps=1, period=1000, direction=1):
        """Side step left (direction=1) or right (direction=-1)"""
        amplitude = [25, 0, 25, 0, 25, 0, 25, 0]
        offset = [90, 90, 90, 90, 90, 90, 90, 90]

        if direction == 1:
            phase = [0, 0, 180, 0, 180, 0, 0, 0]
        else:
            phase = [180, 0, 0, 0, 0, 0, 180, 0]

        self._oscillate_servos(amplitude, offset, phase, steps, period)
        self.home()

    def dance(self, steps=4, period=600):
        """Dance routine"""
        for _ in range(steps // 2):
            self.lateral(1, period, 1)
            self.lateral(1, period, -1)

    def cleanup(self):
        """Deinitialize servos (free resources)"""
        for servo in self.servos:
            if servo:
                servo.deinit()
