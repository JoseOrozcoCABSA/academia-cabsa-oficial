import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonDraft, lessonPayload, lessonType, slugify } from './courseEditorModel.js';

test('slugify normaliza acentos y separadores', () => {
  assert.equal(slugify('  Evaluación Final: Álgebra  '), 'evaluacion-final-algebra');
});

test('lessonDraft convierte segundos a minutos y conserva el tipo', () => {
  const draft = lessonDraft({ title: 'Examen', lesson_type: 'EXAM', minimum_reading_seconds: 301 });
  assert.equal(draft.minimum_reading_minutes, 6);
  assert.equal(draft.lesson_type, 'EXAM');
  assert.equal(lessonType('DESCONOCIDO').short, 'Contenido');
});

test('lessonPayload exige al menos un minuto y elimina el campo de edición', () => {
  const payload = lessonPayload({ title: 'Lectura', minimum_reading_minutes: 0 });
  assert.equal(payload.minimum_reading_seconds, 60);
  assert.equal('minimum_reading_minutes' in payload, false);
});
