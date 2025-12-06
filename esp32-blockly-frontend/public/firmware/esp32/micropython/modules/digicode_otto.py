"""
DigiCodeOtto - MicroPython implementation for OTTO-compatible bipedal robots

Copyright (c) 2025 DigiCode Project
Licensed under the MIT License

This module provides motion control for 4-servo bipedal robots on ESP32.
"""

from machine import Pin, PWM
import time
import math

# Servo indices
SERVO_LEFT_LEG = 0
SERVO_RIGHT_LEG = 1
SERVO_LEFT_FOOT = 2
SERVO_RIGHT_FOOT = 3

# Default neutral position (degrees)
NEUTRAL_POSITION = 90

# PWM frequency for servos (Hz)
SERVO_FREQ = 50

# Pulse width range for SG90 servos (microseconds)
PULSE_MIN = 500   # 0 degrees
PULSE_MAX = 2500  # 180 degrees


class DigiCodeOtto:
    def __init__(self):
        self.servos = [None, None, None, None]
        self.pins = [0, 0, 0, 0]
        self.trims = [0, 0, 0, 0]
        self.current_angles = [NEUTRAL_POSITION] * 4

    def init(self, pin_left_leg, pin_right_leg, pin_left_foot, pin_right_foot):
        """Initialize servos with pin assignments"""
        self.pins[SERVO_LEFT_LEG] = pin_left_leg
        self.pins[SERVO_RIGHT_LEG] = pin_right_leg
        self.pins[SERVO_LEFT_FOOT] = pin_left_foot
        self.pins[SERVO_RIGHT_FOOT] = pin_right_foot

        # Create PWM objects for each servo
        for i in range(4):
            self.servos[i] = PWM(Pin(self.pins[i]), freq=SERVO_FREQ)

        # Move to home position
        self.home()

    def set_trims(self, trim_ll, trim_rl, trim_lf, trim_rf):
        """Set calibration offsets for each servo"""
        self.trims[SERVO_LEFT_LEG] = trim_ll
        self.trims[SERVO_RIGHT_LEG] = trim_rl
        self.trims[SERVO_LEFT_FOOT] = trim_lf
        self.trims[SERVO_RIGHT_FOOT] = trim_rf

    def _angle_to_duty(self, angle):
        """Convert angle (0-180) to PWM duty cycle"""
        # Linear mapping from angle to pulse width
        pulse_width = PULSE_MIN + (PULSE_MAX - PULSE_MIN) * angle / 180
        # Convert pulse width (µs) to duty cycle (0-1023 for ESP32)
        duty = int(pulse_width / 20000 * 1023)  # 20ms period at 50Hz
        return max(0, min(1023, duty))

    def _set_servo(self, servo_index, angle):
        """Set servo to specified angle with trim applied"""
        if 0 <= servo_index < 4 and self.servos[servo_index]:
            # Apply trim and constrain
            adjusted = max(0, min(180, angle + self.trims[servo_index]))
            duty = self._angle_to_duty(adjusted)
            self.servos[servo_index].duty(duty)
            self.current_angles[servo_index] = angle

    def home(self):
        """Move to neutral standing position"""
        for i in range(4):
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
            for i in range(4):
                angle = int(initial_angles[i] + (target_angles[i] - initial_angles[i]) * eased)
                self._set_servo(i, angle)

            time.sleep_ms(10)

        # Ensure final position
        for i in range(4):
            self._set_servo(i, target_angles[i])

    def _oscillate_servos(self, amplitude, offset, phase, cycle_count, period_ms):
        """Oscillate servos with specified parameters"""
        start_time = time.ticks_ms()
        total_time = cycle_count * period_ms

        while time.ticks_diff(time.ticks_ms(), start_time) < total_time:
            elapsed = time.ticks_diff(time.ticks_ms(), start_time)
            t = (elapsed % period_ms) / period_ms  # 0.0 to 1.0 within one cycle

            for i in range(4):
                # Calculate oscillation: offset + amplitude * sin(2π * (t + phase))
                phase_shift = phase[i] / 360.0
                angle_rad = 2.0 * math.pi * (t + phase_shift)
                angle = offset[i] + int(amplitude[i] * math.sin(angle_rad))
                self._set_servo(i, angle)

            time.sleep_ms(10)

    # === LOCOMOTION ===

    def walk(self, steps=2, period=1000, direction=1):
        """Walk forward (direction=1) or backward (direction=-1)"""
        amplitude = [25, 25, 15, 15]
        offset = [NEUTRAL_POSITION] * 4

        if direction == 1:  # Forward
            phase = [0, 180, 90, 270]
        else:  # Backward
            phase = [180, 0, 270, 90]

        self._oscillate_servos(amplitude, offset, phase, steps, period)
        self.home()

    def turn(self, steps=2, period=1000, direction=1):
        """Turn left (direction=1) or right (direction=-1)"""
        offset = [NEUTRAL_POSITION] * 4
        phase = [0, 0, 90, 90]

        if direction == 1:  # Turn left
            amplitude = [15, 30, 10, 10]
        else:  # Turn right
            amplitude = [30, 15, 10, 10]

        self._oscillate_servos(amplitude, offset, phase, steps, period)
        self.home()

    def jump(self, steps=1, period=500):
        """Jump in place"""
        amplitude = [0, 0, 30, 30]
        offset = [NEUTRAL_POSITION] * 4
        phase = [0, 0, 0, 0]

        self._oscillate_servos(amplitude, offset, phase, steps, period)
        self.home()

    def moonwalk(self, steps=2, period=1000, direction=1):
        """Moonwalk right (direction=1) or left (direction=-1)"""
        amplitude = [15, 15, 30, 30]
        offset = [NEUTRAL_POSITION] * 4

        if direction == 1:  # Right
            phase = [0, 180, 270, 90]
        else:  # Left
            phase = [180, 0, 90, 270]

        self._oscillate_servos(amplitude, offset, phase, steps, period)
        self.home()

    # === GESTURES ===

    def bend_left(self, steps=1, period=1000):
        """Lean left"""
        target = [NEUTRAL_POSITION + 30, NEUTRAL_POSITION - 30, NEUTRAL_POSITION, NEUTRAL_POSITION]

        for _ in range(steps):
            self.move_servos(period // 2, target)
            self.home()

    def bend_right(self, steps=1, period=1000):
        """Lean right"""
        target = [NEUTRAL_POSITION - 30, NEUTRAL_POSITION + 30, NEUTRAL_POSITION, NEUTRAL_POSITION]

        for _ in range(steps):
            self.move_servos(period // 2, target)
            self.home()

    def shake_leg(self, steps=1, period=1000, direction=1):
        """Shake right leg (direction=1) or left leg (direction=-1)"""
        offset = [NEUTRAL_POSITION] * 4
        phase = [0, 0, 0, 180]

        if direction == 1:  # Right leg
            amplitude = [0, 0, 0, 30]
        else:  # Left leg
            amplitude = [0, 0, 30, 0]

        self._oscillate_servos(amplitude, offset, phase, steps, period)
        self.home()

    def swing(self, steps=2, period=1000):
        """Swing body side to side"""
        amplitude = [20, 20, 0, 0]
        offset = [NEUTRAL_POSITION] * 4
        phase = [0, 0, 0, 0]

        self._oscillate_servos(amplitude, offset, phase, steps, period)
        self.home()

    def dance(self, steps=4, period=600):
        """Perform a simple dance routine"""
        for _ in range(steps // 2):
            self.bend_left(1, period)
            self.bend_right(1, period)

    def cleanup(self):
        """Deinitialize servos (free resources)"""
        for servo in self.servos:
            if servo:
                servo.deinit()
