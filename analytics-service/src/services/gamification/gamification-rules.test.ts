/**
 * @file Pruebas de las reglas puras de gamificación.
 *
 * La racha es la regla con más casos límite del sistema de puntos —corte a los
 * dos días, actividad repetida en la misma jornada, racha histórica mayor que la
 * actual— y hasta ahora no tenía ninguna prueba. El día de hoy se inyecta en
 * cada caso, así que los resultados no dependen de cuándo se ejecuten.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COURSE_COMPLETION_XP,
  LESSON_XP,
  XP_PER_LEVEL,
  dateKey,
  dayBefore,
  normalizeSemaphoreStatus,
  numberValue,
  streakFrom,
  xpLevel,
} from './gamification-rules.js';

/** Construye las filas de actividad tal como las devuelve el repositorio. */
const activity = (...dates: string[]): Record<string, unknown>[] =>
  dates.map((activity_date) => ({ activity_date }));

describe('normalizeSemaphoreStatus', () => {
  it('acepta las grafías en inglés', () => {
    assert.equal(normalizeSemaphoreStatus('GREEN'), 'GREEN');
    assert.equal(normalizeSemaphoreStatus('REINFORCE'), 'YELLOW');
    assert.equal(normalizeSemaphoreStatus('SUPPORT'), 'RED');
  });

  it('acepta las grafías en español', () => {
    assert.equal(normalizeSemaphoreStatus('verde'), 'GREEN');
    assert.equal(normalizeSemaphoreStatus('amarillo'), 'YELLOW');
    assert.equal(normalizeSemaphoreStatus('rojo'), 'RED');
  });

  it('acepta las etiquetas antiguas del frontend', () => {
    assert.equal(normalizeSemaphoreStatus('COMPRENDI_BIEN'), 'GREEN');
    assert.equal(normalizeSemaphoreStatus('NECESITO_REFORZAR'), 'YELLOW');
    assert.equal(normalizeSemaphoreStatus('NECESITO_APOYO'), 'RED');
  });

  it('ignora mayúsculas y espacios sobrantes', () => {
    assert.equal(normalizeSemaphoreStatus('  verde  '), 'GREEN');
  });

  it('devuelve null para un valor no reconocido, en vez de lanzar', () => {
    assert.equal(normalizeSemaphoreStatus('AZUL'), null);
    assert.equal(normalizeSemaphoreStatus(undefined), null);
    assert.equal(normalizeSemaphoreStatus(''), null);
  });
});

describe('dateKey', () => {
  it('normaliza una fecha a YYYY-MM-DD', () => {
    assert.equal(dateKey(new Date('2026-08-04T23:30:00Z')), '2026-08-04');
  });

  it('acepta la fecha como cadena', () => {
    assert.equal(dateKey('2026-08-04'), '2026-08-04');
  });
});

describe('dayBefore', () => {
  it('devuelve el día anterior', () => {
    assert.equal(dayBefore('2026-08-04'), '2026-08-03');
  });

  it('cruza el cambio de mes', () => {
    assert.equal(dayBefore('2026-08-01'), '2026-07-31');
  });

  it('cruza el cambio de año', () => {
    assert.equal(dayBefore('2026-01-01'), '2025-12-31');
  });

  it('resuelve el 29 de febrero de un año bisiesto', () => {
    assert.equal(dayBefore('2028-03-01'), '2028-02-29');
  });
});

describe('streakFrom', () => {
  const today = '2026-08-04';

  it('devuelve todo a cero sin actividad', () => {
    assert.deepEqual(streakFrom([], today), {
      activeDays: 0,
      current: 0,
      longest: 0,
      lastActivity: null,
    });
  });

  it('cuenta los días consecutivos terminados hoy', () => {
    const streak = streakFrom(activity('2026-08-04', '2026-08-03', '2026-08-02'), today);
    assert.equal(streak.current, 3);
    assert.equal(streak.longest, 3);
    assert.equal(streak.activeDays, 3);
    assert.equal(streak.lastActivity, '2026-08-04');
  });

  it('mantiene la racha si la última actividad fue ayer', () => {
    const streak = streakFrom(activity('2026-08-03', '2026-08-02'), today);
    assert.equal(streak.current, 2);
  });

  it('rompe la racha cuando pasaron dos días', () => {
    const streak = streakFrom(activity('2026-08-02', '2026-08-01'), today);
    assert.equal(streak.current, 0);
    assert.equal(streak.longest, 2, 'la racha histórica se conserva');
  });

  it('cuenta una sola vez varias actividades del mismo día', () => {
    const streak = streakFrom(activity('2026-08-04', '2026-08-04', '2026-08-03'), today);
    assert.equal(streak.activeDays, 2);
    assert.equal(streak.current, 2);
  });

  it('no exige que las fechas lleguen ordenadas', () => {
    const streak = streakFrom(activity('2026-08-02', '2026-08-04', '2026-08-03'), today);
    assert.equal(streak.current, 3);
  });

  it('conserva la racha histórica mayor aunque la actual sea menor', () => {
    const streak = streakFrom(
      activity(
        '2026-08-04',
        '2026-07-20', '2026-07-19', '2026-07-18', '2026-07-17',
      ),
      today,
    );
    assert.equal(streak.current, 1);
    assert.equal(streak.longest, 4);
  });

  it('cuenta un único día de actividad', () => {
    const streak = streakFrom(activity('2026-08-04'), today);
    assert.deepEqual(streak, {
      activeDays: 1,
      current: 1,
      longest: 1,
      lastActivity: '2026-08-04',
    });
  });

  it('cruza el cambio de mes sin romper la racha', () => {
    const streak = streakFrom(
      activity('2026-08-01', '2026-07-31', '2026-07-30'),
      '2026-08-01',
    );
    assert.equal(streak.current, 3);
  });
});

describe('xpLevel', () => {
  it('empieza en el nivel 1 con cero XP', () => {
    const level = xpLevel(0);
    assert.equal(level.level, 1);
    assert.equal(level.currentLevelXp, 0);
    assert.equal(level.levelProgressPercent, 0);
  });

  it('sube de nivel al alcanzar el umbral', () => {
    assert.equal(xpLevel(XP_PER_LEVEL - 1).level, 1);
    assert.equal(xpLevel(XP_PER_LEVEL).level, 2);
  });

  it('calcula el avance dentro del nivel', () => {
    const level = xpLevel(XP_PER_LEVEL + 250);
    assert.equal(level.level, 2);
    assert.equal(level.currentLevelXp, 250);
    assert.equal(level.levelProgressPercent, 50);
  });

  it('expone las recompensas vigentes', () => {
    assert.deepEqual(xpLevel(0).rewards, {
      lesson: LESSON_XP,
      course: COURSE_COMPLETION_XP,
    });
  });

  it('conserva el XP total recibido', () => {
    assert.equal(xpLevel(1234).total, 1234);
  });
});

describe('numberValue', () => {
  it('trata null e undefined como cero', () => {
    assert.equal(numberValue(null), 0);
    assert.equal(numberValue(undefined), 0);
  });

  it('convierte las cadenas numéricas que devuelve MySQL', () => {
    assert.equal(numberValue('42'), 42);
  });
});
