import type { Request, Response } from 'express';
import repository, { type ExamInput } from '#repositories/exams.repository';
import { ok } from '#utils/response';
import { AppError } from '#utils/errors';

const param = (request: Request, key: string) => String(request.params[key]);
const userId = (request: Request) => {
  const value = request.auth?.sub;
  if (!value) throw new AppError('Token de usuario incompleto.', 401, 'INVALID_TOKEN');
  return value;
};
const text = (value: unknown, length: number) => String(value ?? '').trim().slice(0, length);

const examInput = (body: Record<string, unknown>): ExamInput => {
  const title = text(body.title, 255);
  const passingScore = Number(body.passing_score);
  const maxAttempts = Number(body.max_attempts);
  const status = text(body.status, 20).toUpperCase();
  if (!title) throw new AppError('El título del examen es obligatorio.', 400, 'EXAM_TITLE_REQUIRED');
  if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100) {
    throw new AppError('La nota aprobatoria debe estar entre 0 y 100.', 400, 'INVALID_PASSING_SCORE');
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new AppError('Los intentos permitidos deben estar entre 1 y 100.', 400, 'INVALID_MAX_ATTEMPTS');
  }
  if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
    throw new AppError('Estado de examen inválido.', 400, 'INVALID_EXAM_STATUS');
  }
  if (!Array.isArray(body.questions) || !body.questions.length) {
    throw new AppError('El examen necesita al menos una pregunta.', 400, 'EXAM_QUESTIONS_REQUIRED');
  }
  const questions = body.questions.map((raw, questionIndex) => {
    const question = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const type = text(question.type, 30).toUpperCase();
    const prompt = text(question.prompt, 5000);
    const points = Number(question.points);
    if (!['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(type) || !prompt) {
      throw new AppError(`Revisa el tipo y texto de la pregunta ${questionIndex + 1}.`, 400, 'INVALID_QUESTION');
    }
    if (!Number.isFinite(points) || points <= 0 || points > 10000) {
      throw new AppError(`El puntaje de la pregunta ${questionIndex + 1} no es válido.`, 400, 'INVALID_QUESTION_POINTS');
    }
    if (!Array.isArray(question.options)) {
      throw new AppError(`La pregunta ${questionIndex + 1} no tiene opciones.`, 400, 'QUESTION_OPTIONS_REQUIRED');
    }
    const options = question.options.map((rawOption) => {
      const option = rawOption && typeof rawOption === 'object' ? rawOption as Record<string, unknown> : {};
      return { text: text(option.text, 5000), correct: Boolean(option.correct) };
    }).filter((option) => option.text);
    if (options.length < 2 || options.filter((option) => option.correct).length !== 1) {
      throw new AppError(`La pregunta ${questionIndex + 1} requiere al menos dos opciones y una sola respuesta correcta.`, 400, 'INVALID_QUESTION_OPTIONS');
    }
    if (type === 'TRUE_FALSE' && options.length !== 2) {
      throw new AppError(`La pregunta ${questionIndex + 1} de verdadero/falso debe tener dos opciones.`, 400, 'INVALID_TRUE_FALSE_OPTIONS');
    }
    return {
      type: type as 'MULTIPLE_CHOICE' | 'TRUE_FALSE',
      prompt,
      explanation: text(question.explanation, 5000) || null,
      points,
      required: question.required !== false,
      options,
    };
  });
  return {
    title,
    description: text(body.description, 10000) || null,
    passingScore,
    maxAttempts,
    shuffleQuestions: Boolean(body.shuffle_questions),
    showAnswersAfterSubmit: body.show_answers_after_submit !== false,
    status: status as ExamInput['status'],
    questions,
  };
};

export const adminGet = async (request: Request, response: Response): Promise<void> => {
  const lessonId = param(request, 'lessonId');
  const lesson = await repository.lessonExists(lessonId);
  if (!lesson) throw new AppError('Lección no encontrada.', 404, 'LESSON_NOT_FOUND');
  ok(response, { lesson, exam: await repository.adminByLesson(lessonId) });
};

export const adminSave = async (request: Request, response: Response): Promise<void> => {
  const lessonId = param(request, 'lessonId');
  if (!await repository.lessonExists(lessonId)) throw new AppError('Lección no encontrada.', 404, 'LESSON_NOT_FOUND');
  ok(response, await repository.save(lessonId, examInput(request.body)), 200);
};

export const studentGet = async (request: Request, response: Response): Promise<void> => {
  const exam = await repository.studentExam(param(request, 'lessonId'), userId(request));
  ok(response, { exam });
};

export const submit = async (request: Request, response: Response): Promise<void> => {
  const answers = Array.isArray(request.body?.answers) ? request.body.answers.map((answer: unknown) => {
    const value = answer && typeof answer === 'object' ? answer as Record<string, unknown> : {};
    return { questionId: text(value.question_id, 36), optionId: text(value.option_id, 36) };
  }) : [];
  const result = await repository.submit(param(request, 'examId'), userId(request), answers);
  if (!result) throw new AppError('Examen no encontrado o no publicado.', 404, 'EXAM_NOT_FOUND');
  ok(response, result, 201);
};
