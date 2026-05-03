import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../catalog';
import {
  generateComboCases,
  INIT_DEPENDENCIES,
  OPERATION_TO_INIT_MAP,
} from './combo';

const cat = loadCatalog();

describe('INIT_DEPENDENCIES (manual map)', () => {
  it('all init types exist in catalog', () => {
    const types = new Set(cat.blocks.map((b) => b.type));
    for (const dep of INIT_DEPENDENCIES) {
      expect(
        types.has(dep.init),
        `init "${dep.init}" missing from catalog`,
      ).toBe(true);
    }
  });

  it('all operation types exist in catalog', () => {
    const types = new Set(cat.blocks.map((b) => b.type));
    for (const dep of INIT_DEPENDENCIES) {
      for (const op of dep.operations) {
        expect(
          types.has(op),
          `operation "${op}" (under init "${dep.init}") missing from catalog`,
        ).toBe(true);
      }
    }
  });

  it('every init block is statement-typed OR value-typed (combo wraps value with controls_if)', () => {
    // 第72回 expansion で value-typed init (mpu6050_init 等、hasOutput=true) を
    // controls_if IF0=initSynth で wrap する synthesizeInitForSetup helper 導入後、
    // SETUP context に挿入可能な init 形式は 2 種 (isStatement / hasOutput) の OR。
    // どちらでもない (rootOnly のみ等) init は INIT_DEPENDENCIES から除外する想定。
    const idx = new Map(cat.blocks.map((b) => [b.type, b]));
    for (const dep of INIT_DEPENDENCIES) {
      const block = idx.get(dep.init);
      expect(block, `init "${dep.init}" missing`).toBeDefined();
      const placeable = block?.isStatement === true || block?.hasOutput === true;
      expect(
        placeable,
        `init "${dep.init}" is neither statement nor value (cannot be placed in SETUP)`,
      ).toBe(true);
    }
  });

  it('covers cluster top of the 1000-case run', () => {
    // 10 prefix (第64回 mqtt expand + json split + 第65回 BUG-072 diff_drive add):
    // ~101 fail (35%) cluster top + 第64回 cluster #3 (6 件) を解消、json は read
    // (_jsonDoc) と write (_jsonOutDoc) の 2 系統。
    const labels = INIT_DEPENDENCIES.map((d) => d.label).filter(Boolean);
    expect(labels).toEqual(
      expect.arrayContaining([
        'humanoid',
        'transform',
        'wheel',
        'qtr-8a',
        'mqtt',
        'neopixel',
        'json-read',
        'json-write',
        'diff-drive',
      ]),
    );
  });
});

describe('OPERATION_TO_INIT_MAP (derived)', () => {
  it('maps humanoid_dance → humanoid_init', () => {
    expect(OPERATION_TO_INIT_MAP.get('humanoid_dance')).toBe('humanoid_init');
  });

  it('maps mqtt_publish → mqtt_setup', () => {
    expect(OPERATION_TO_INIT_MAP.get('mqtt_publish')).toBe('mqtt_setup');
  });

  it('maps mqtt_connect / mqtt_publish_qos / mqtt_set_buffer_size → mqtt_setup (第64回 expand)', () => {
    expect(OPERATION_TO_INIT_MAP.get('mqtt_connect')).toBe('mqtt_setup');
    expect(OPERATION_TO_INIT_MAP.get('mqtt_publish_qos')).toBe('mqtt_setup');
    expect(OPERATION_TO_INIT_MAP.get('mqtt_set_buffer_size')).toBe(
      'mqtt_setup',
    );
  });

  it('maps json read ops → json_parse (_jsonDoc, 第64回 split)', () => {
    expect(OPERATION_TO_INIT_MAP.get('json_get_string')).toBe('json_parse');
    expect(OPERATION_TO_INIT_MAP.get('json_array_get')).toBe('json_parse');
    expect(OPERATION_TO_INIT_MAP.get('json_has_key')).toBe('json_parse');
  });

  it('maps json write ops → json_create_object (_jsonOutDoc)', () => {
    expect(OPERATION_TO_INIT_MAP.get('json_set_bool')).toBe(
      'json_create_object',
    );
    expect(OPERATION_TO_INIT_MAP.get('json_to_string')).toBe(
      'json_create_object',
    );
  });

  it('does not map a non-listed block', () => {
    expect(OPERATION_TO_INIT_MAP.get('arduino_setup')).toBeUndefined();
    expect(OPERATION_TO_INIT_MAP.get('logic_compare')).toBeUndefined();
  });

  it('first init wins when two prefixes share an op (qtr_8a vs qtr_8rc)', () => {
    // qtr_calibrate is shared between qtr_8a_init and qtr_8rc_init,
    // so the singleton-init-aware path picks the first declared init.
    expect(OPERATION_TO_INIT_MAP.get('qtr_calibrate')).toBe('qtr_8a_init');
  });

  it('maps diff_drive_* operation blocks → diff_drive_init (BUG-072)', () => {
    // diff_drive_init declares diffSetMotors / DIFF_L_* / DIFF_R_* in
    // generator.definitions_; without it any diff_drive_* operation block
    // hits `'diffSetMotors' was not declared in this scope`.
    expect(OPERATION_TO_INIT_MAP.get('diff_drive_forward')).toBe(
      'diff_drive_init',
    );
    expect(OPERATION_TO_INIT_MAP.get('diff_drive_backward')).toBe(
      'diff_drive_init',
    );
    expect(OPERATION_TO_INIT_MAP.get('diff_drive_set_speed')).toBe(
      'diff_drive_init',
    );
    expect(OPERATION_TO_INIT_MAP.get('diff_drive_curve')).toBe(
      'diff_drive_init',
    );
    expect(OPERATION_TO_INIT_MAP.get('diff_drive_line_trace')).toBe(
      'diff_drive_init',
    );
  });

  it('maps Tier 1 第72回 expansion ops → expected init (cluster top guard)', () => {
    // Tier 1 = cluster top で実証 (1000-case `2026-05-03_04-40-54`, 90.4%)
    expect(OPERATION_TO_INIT_MAP.get('rtc_set_time')).toBe('rtc_init');
    expect(OPERATION_TO_INIT_MAP.get('rus04_distance')).toBe('rus04_init');
    expect(OPERATION_TO_INIT_MAP.get('dht_temperature')).toBe('dht_init');
    expect(OPERATION_TO_INIT_MAP.get('stepper_move')).toBe('stepper_init');
    expect(OPERATION_TO_INIT_MAP.get('mpu6050_read_accel')).toBe('mpu6050_init');
  });

  it('maps Tier 2 第72回 expansion ops → expected init (future-proof)', () => {
    expect(OPERATION_TO_INIT_MAP.get('as5600_read_angle')).toBe('as5600_init');
    expect(OPERATION_TO_INIT_MAP.get('bme280_read')).toBe('bme280_init');
    expect(OPERATION_TO_INIT_MAP.get('bmp280_read_altitude')).toBe('bmp280_init');
    expect(OPERATION_TO_INIT_MAP.get('ultrasonic_distance')).toBe(
      'ultrasonic_init',
    );
    expect(OPERATION_TO_INIT_MAP.get('vl53l0x_read_distance_mm')).toBe(
      'vl53l0x_init',
    );
    expect(OPERATION_TO_INIT_MAP.get('camera_capture')).toBe('camera_init');
    expect(OPERATION_TO_INIT_MAP.get('can_send')).toBe('can_init');
    expect(OPERATION_TO_INIT_MAP.get('dfplayer_play')).toBe('dfplayer_init');
  });
});

describe('generateComboCases', () => {
  const cases = generateComboCases(cat);

  it('emits at least one case per init prefix (when catalog has the init)', () => {
    // 10 init prefixes (第64回 + 第65回 BUG-072): humanoid + transform + wheel +
    // qtr-8a + qtr-8rc + mqtt + neopixel + json-read + json-write + diff-drive
    expect(cases.length).toBeGreaterThanOrEqual(10);
  });

  it('every case is tagged with strategy="combo"', () => {
    for (const c of cases) expect(c.strategy).toBe('combo');
  });

  it('case ids are zero-padded sequential starting at case_0001', () => {
    expect(cases[0].id).toBe('case_0001');
    for (let i = 0; i < cases.length; i++) {
      expect(cases[i].id).toBe(`case_${String(i + 1).padStart(4, '0')}`);
    }
  });

  it('every combo xml contains both arduino_setup and arduino_loop', () => {
    for (const c of cases) {
      expect(c.xml).toContain('type="arduino_setup"');
      expect(c.xml).toContain('type="arduino_loop"');
    }
  });

  it('every combo case includes its init block in blocksUsed', () => {
    for (const c of cases) {
      const matchingInit = INIT_DEPENDENCIES.find((d) =>
        c.blocksUsed.includes(d.init),
      );
      expect(
        matchingInit,
        `case ${c.id} has no INIT_DEPENDENCIES init in blocksUsed: ${c.blocksUsed.join(',')}`,
      ).toBeDefined();
    }
  });

  it('honours maxCount and startIndex', () => {
    const some = generateComboCases(cat, { maxCount: 3, startIndex: 100 });
    expect(some.length).toBe(3);
    expect(some[0].id).toBe('case_0100');
    expect(some[2].id).toBe('case_0102');
  });

  it('humanoid combo case includes humanoid_init + at least one humanoid op', () => {
    const humanoidCase = cases.find((c) =>
      c.blocksUsed.includes('humanoid_init'),
    );
    expect(humanoidCase).toBeDefined();
    const ops = humanoidCase!.blocksUsed.filter(
      (b) => b.startsWith('humanoid_') && b !== 'humanoid_init',
    );
    expect(ops.length).toBeGreaterThanOrEqual(1);
  });
});
