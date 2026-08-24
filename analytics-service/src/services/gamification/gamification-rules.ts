/**
 * @file Reglas puras de gamificación: semáforo, fechas, rachas, XP y niveles.
 *
 * No consulta la base ni conoce el repositorio: recibe filas ya leídas y
 * devuelve el cálculo. Es la parte del sistema de puntos que se puede probar
 * sin MySQL, y donde vive todo lo que decide cuánto avanza un usuario.
 *
 * Las funciones que dependen del día de hoy lo reciben como parámetro opcional.
 * Por omisión usan el reloj real, de modo que quien las llama no cambia; pero
 * las pruebas pueden fijar la fecha y comprobar el corte de la racha sin
 * depender de cuándo se ejecuten.
 *
 * @see ../gamification.service.ts Orquesta estas reglas con el repositorio.
 */

import type { SemaphoreStatus } from '#repositories/gamification.repository';

/** XP por completar una lección. */
export const LESSON_XP = 100;

/** XP extra al terminar un curso completo. */
export const COURSE_COMPLETION_XP = 500;

/**
 * XP necesario por nivel.
 *
 * La progresión es lineal, no creciente: cada nivel cuesta lo mismo. Cambiar
 * este valor reordena de golpe los niveles de todos los usuarios, porque el
 * nivel se calcula al leer y no se guarda.
 */
export const XP_PER_LEVEL = 500;

/**
 * Grafías admitidas del semáforo.
 *
 * Conviven inglés, español y las etiquetas antiguas del frontend porque han
 * estado en uso varias versiones del cliente a la vez.
 */
const SEMAPHORE_ALIASES: Record<string, SemaphoreStatus> = {
  GREEN: 'GREEN',
  VERDE: 'GREEN',
  UNDERSTOOD: 'GREEN',
  COMPRENDI_BIEN: 'GREEN',
  YELLOW: 'YELLOW',
  AMARILLO: 'YELLOW',
  REINFORCE: 'YELLOW',
  NECESITO_REFORZAR: 'YELLOW',
  RED: 'RED',
  ROJO: 'RED',
  SUPPORT: 'RED',
  NECESITO_APOYO: 'RED',
};

/** Resultado del cálculo de racha. */
export interface Streak {
  activeDays: number;
  current: number;
  longest: number;
  lastActivity: string | null;
}

/**
 * Traduce el semáforo recibido a su valor canónico.
 *
 * No distingue mayúsculas ni espacios sobrantes.
 *
 * @returns El valor canónico, o `null` si no se reconoce. Devolver `null` en vez
 *   de lanzar hace que un filtro con valor inválido se comporte como «sin
 *   filtro» en lugar de dar error.
 */
export const normalizeSemaphoreStatus = (value: unknown): SemaphoreStatus | null =>
  SEMAPHORE_ALIASES[String(value ?? '').trim().toUpperCase()] ?? null;

/**
 * Normaliza una fecha a `YYYY-MM-DD`.
 *
 * Usa `toISOString`, o sea **UTC**. Como las fechas de actividad las genera
 * MySQL con `CURRENT_DATE()` en su propia zona, un usuario que complete algo de
 * madrugada puede quedar asignado al día anterior o al siguiente según la
 * diferencia entre ambas zonas.
 */
export const dateKey = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value));
  return date.toISOString().slice(0, 10);
};

/**
 * Devuelve el día anterior a una fecha `YYYY-MM-DD`.
 *
 * Ancla la hora a mediodía UTC antes de restar el día para que el cambio de
 * horario de verano no desplace el resultado en una jornada.
 */
export const dayBefore = (value: string): string => {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

/** Día de hoy en `YYYY-MM-DD` y en UTC. */
export const todayKey = (): string => new Date().toISOString().slice(0, 10);

/**
 * Calcula la racha a partir de las fechas con actividad.
 *
 * Deduplica y ordena de más reciente a más antigua, y recorre buscando días
 * consecutivos.
 *
 * La racha en curso sólo cuenta si la última actividad fue **hoy o ayer**: dejar
 * pasar dos días la rompe. Incluir «ayer» evita que la racha se pierda a
 * medianoche antes de que el usuario entre.
 *
 * @param values Filas con la columna `activity_date`.
 * @param today Día de referencia; se inyecta para poder probar el corte.
 * @returns Con lista vacía, todo a cero y `lastActivity` en `null`.
 */
export const streakFrom = (
  values: Record<string, unknown>[],
  today: string = todayKey(),
): Streak => {
  /**
   * Días con actividad, sin repetir y del más reciente al más antiguo.
   *
   * Se agrupa por día porque varias acciones en la misma jornada cuentan como
   * una sola para la racha. El orden descendente es lo que permite recorrer
   * hacia atrás comparando cada día con el anterior.
   */
  const dates = [...new Set(values.map((row) => dateKey(row.activity_date)))]
    .sort()
    .reverse();
  if (!dates.length) {
    return { activeDays: 0, current: 0, longest: 0, lastActivity: null };
  }

  let longest = 1;
  let sequence = 1;
  for (let index = 1; index < dates.length; index += 1) {
    if (dates[index] === dayBefore(dates[index - 1])) {
      sequence += 1;
      longest = Math.max(longest, sequence);
    } else {
      sequence = 1;
    }
  }

  const eligible = dates[0] === today || dates[0] === dayBefore(today);
  let current = eligible ? 1 : 0;
  if (eligible) {
    for (let index = 1; index < dates.length; index += 1) {
      if (dates[index] !== dayBefore(dates[index - 1])) break;
      current += 1;
    }
  }

  return {
    activeDays: dates.length,
    current,
    longest,
    lastActivity: dates[0],
  };
};

/** Convierte a número tratando `null`/`undefined` como 0. */
export const numberValue = (value: unknown): number => Number(value ?? 0);

/**
 * Deriva nivel y avance dentro del nivel a partir del XP total.
 *
 * El nivel empieza en 1, no en 0. No se persiste nada: se recalcula en cada
 * consulta desde la suma de eventos de XP.
 */
export const xpLevel = (totalXp: number) => {
  const currentLevelXp = totalXp % XP_PER_LEVEL;
  return {
    total: totalXp,
    level: Math.floor(totalXp / XP_PER_LEVEL) + 1,
    currentLevelXp,
    nextLevelXp: XP_PER_LEVEL,
    levelProgressPercent: Math.round((currentLevelXp / XP_PER_LEVEL) * 100),
    rewards: {
      lesson: LESSON_XP,
      course: COURSE_COMPLETION_XP,
    },
  };
};
