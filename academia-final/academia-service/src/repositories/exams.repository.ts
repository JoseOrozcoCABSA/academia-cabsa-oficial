import { randomUUID } from 'node:crypto';
import { QueryTypes, type Transaction } from 'sequelize';
import database from '#config/database';
import { AppError } from '#utils/errors';
import { ExamAnswer, ExamOption, ExamQuestion } from '#models/ExamModels';

type Row = Record<string, unknown>;
type QuestionInput = {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  prompt: string;
  explanation: string | null;
  points: number;
  required: boolean;
  options: Array<{ text: string; correct: boolean }>;
};
export type ExamInput = {
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showAnswersAfterSubmit: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  questions: QuestionInput[];
};

const rows = <T extends Row>(
  sql: string,
  replacements: Record<string, unknown> = {},
  transaction?: Transaction,
): Promise<T[]> => database.query<T>(sql, {
  replacements,
  transaction,
  type: QueryTypes.SELECT,
});
const one = async <T extends Row>(
  sql: string,
  replacements: Record<string, unknown> = {},
  transaction?: Transaction,
) => (await rows<T>(sql, replacements, transaction))[0] ?? null;

const examBaseSql = `SELECT e.*,l.title lesson_title,l.course_id,c.title course_title
  FROM academia_examenes e
  INNER JOIN academia_lecciones l ON l.id=e.lesson_id
  INNER JOIN academia_cursos c ON c.id=l.course_id`;

export class ExamsRepository {
  lessonExists(lessonId: string) {
    return one<Row>('SELECT id,title,course_id FROM academia_lecciones WHERE id=:lessonId LIMIT 1', { lessonId });
  }

  async examByLesson(lessonId: string, publishedOnly = false, transaction?: Transaction) {
    return one<Row>(
      `${examBaseSql} WHERE e.lesson_id=:lessonId ${publishedOnly ? "AND e.status='PUBLISHED'" : ''} LIMIT 1`,
      { lessonId },
      transaction,
    );
  }

  async examDetails(exam: Row, includeCorrect: boolean, transaction?: Transaction) {
    const questions = await rows<Row>(
      `SELECT id,exam_id,question_type,prompt,${includeCorrect ? 'explanation,' : ''}points,position,is_required
       FROM academia_examen_preguntas WHERE exam_id=:examId ORDER BY position,id`,
      { examId: exam.id },
      transaction,
    );
    if (!questions.length) return { ...exam, questions: [] };
    const options = await rows<Row>(
      `SELECT id,question_id,option_text,position${includeCorrect ? ',is_correct' : ''}
       FROM academia_examen_opciones
       WHERE question_id IN (:questionIds) ORDER BY position,id`,
      { questionIds: questions.map((question) => question.id) },
      transaction,
    );
    return {
      ...exam,
      questions: questions.map((question) => ({
        ...question,
        options: options.filter((option) => option.question_id === question.id),
      })),
    };
  }

  async adminByLesson(lessonId: string) {
    const exam = await this.examByLesson(lessonId);
    return exam ? this.examDetails(exam, true) : null;
  }

  async save(lessonId: string, input: ExamInput) {
    return database.transaction(async (transaction) => {
      const existing = await this.examByLesson(lessonId, false, transaction);
      const examId = String(existing?.id ?? randomUUID());
      const now = new Date();
      if (existing) {
        await database.query(
          `UPDATE academia_examenes SET title=:title,description=:description,
            passing_score=:passingScore,max_attempts=:maxAttempts,
            shuffle_questions=:shuffleQuestions,show_answers_after_submit=:showAnswersAfterSubmit,
            status=:status,updated_at=:now WHERE id=:examId`,
          { replacements: { ...input, examId, now }, transaction },
        );
        await database.query(
          'DELETE FROM academia_examen_preguntas WHERE exam_id=:examId',
          { replacements: { examId }, transaction },
        );
      } else {
        await database.query(
          `INSERT INTO academia_examenes
            (id,lesson_id,title,description,passing_score,max_attempts,shuffle_questions,
             show_answers_after_submit,status,created_at,updated_at)
           VALUES
            (:examId,:lessonId,:title,:description,:passingScore,:maxAttempts,:shuffleQuestions,
             :showAnswersAfterSubmit,:status,:now,:now)`,
          { replacements: { ...input, examId, lessonId, now }, transaction },
        );
      }
      const questionRows = input.questions.map((question, questionIndex) => ({
        id: randomUUID(), exam_id: examId, question_type: question.type,
        prompt: question.prompt, explanation: question.explanation, points: question.points,
        position: questionIndex + 1, is_required: question.required,
        created_at: now, updated_at: now,
      }));
      if (questionRows.length) {
        await ExamQuestion.bulkCreate(questionRows, { transaction });
        const optionRows = input.questions.flatMap((question, questionIndex) =>
          question.options.map((option, optionIndex) => ({
            id: randomUUID(), question_id: questionRows[questionIndex].id,
            option_text: option.text, is_correct: option.correct, position: optionIndex + 1,
          })));
        if (optionRows.length) await ExamOption.bulkCreate(optionRows, { transaction });
      }
      const saved = await this.examByLesson(lessonId, false, transaction);
      return this.examDetails(saved as Row, true, transaction);
    });
  }

  async studentExam(lessonId: string, userId: string) {
    const exam = await this.examByLesson(lessonId, true);
    if (!exam) return null;
    const [summary, attempts] = await Promise.all([
      one<Row>(
        `SELECT COUNT(*) attempts_used,MAX(score) best_score,MAX(passed) passed
         FROM academia_examen_intentos WHERE exam_id=:examId AND user_id=:userId`,
        { examId: exam.id, userId },
      ),
      rows<Row>(
        `SELECT id,attempt_number,score,earned_points,total_points,passed,submitted_at
         FROM academia_examen_intentos WHERE exam_id=:examId AND user_id=:userId
         ORDER BY attempt_number DESC LIMIT 10`,
        { examId: exam.id, userId },
      ),
    ]);
    const details = await this.examDetails(exam, false);
    if (Boolean(exam.shuffle_questions)) {
      (details.questions as Row[]).sort(() => Math.random() - 0.5);
    }
    return { ...details, progress: summary, attempts };
  }

  async submit(examId: string, userId: string, inputAnswers: Array<{ questionId: string; optionId: string }>) {
    return database.transaction(async (transaction) => {
      const exam = await one<Row>(
        `${examBaseSql} WHERE e.id=:examId AND e.status='PUBLISHED' LIMIT 1 FOR UPDATE`,
        { examId },
        transaction,
      );
      if (!exam) return null;
      const previous = await one<Row>(
        `SELECT COUNT(*) attempts_used
         FROM academia_examen_intentos WHERE exam_id=:examId AND user_id=:userId`,
        { examId, userId },
        transaction,
      );
      const attemptsUsed = Number(previous?.attempts_used ?? 0);
      const questions = await rows<Row>(
        `SELECT q.id,q.question_type,q.prompt,q.explanation,q.points,q.position,
          o.id option_id,o.option_text,o.is_correct,o.position option_position
         FROM academia_examen_preguntas q
         INNER JOIN academia_examen_opciones o ON o.question_id=q.id
         WHERE q.exam_id=:examId ORDER BY q.position,o.position`,
        { examId },
        transaction,
      );
      const questionMap = new Map<string, Row[]>();
      for (const item of questions) {
        const key = String(item.id);
        questionMap.set(key, [...(questionMap.get(key) ?? []), item]);
      }
      const selected = new Map(inputAnswers.map((answer) => [answer.questionId, answer.optionId]));
      const totalPoints = [...questionMap.values()].reduce((sum, options) => sum + Number(options[0].points), 0);
      let earnedPoints = 0;
      const graded = [...questionMap.entries()].map(([questionId, options]) => {
        const selectedOption = options.find((option) => String(option.option_id) === selected.get(questionId));
        const correctOption = options.find((option) => Boolean(option.is_correct)) as Row;
        const correct = Boolean(selectedOption?.is_correct);
        const awarded = correct ? Number(options[0].points) : 0;
        earnedPoints += awarded;
        return {
          questionId,
          prompt: options[0].prompt,
          type: options[0].question_type,
          explanation: options[0].explanation,
          selectedText: selectedOption?.option_text ?? null,
          correctText: correctOption.option_text,
          correct,
          points: Number(options[0].points),
          awarded,
        };
      });
      const score = totalPoints ? Math.round((earnedPoints / totalPoints) * 10000) / 100 : 0;
      const passed = score >= Number(exam.passing_score);
      const attemptId = randomUUID();
      const now = new Date();
      await database.query(
        `INSERT INTO academia_examen_intentos
          (id,exam_id,user_id,attempt_number,score,earned_points,total_points,passed,started_at,submitted_at)
         VALUES (:id,:examId,:userId,:attemptNumber,:score,:earnedPoints,:totalPoints,:passed,:now,:now)`,
        {
          replacements: {
            id: attemptId, examId, userId, attemptNumber: attemptsUsed + 1,
            score, earnedPoints, totalPoints, passed, now,
          },
          transaction,
        },
      );
      if (graded.length) {
        await ExamAnswer.bulkCreate(graded.map((answer) => ({
          id: randomUUID(), attempt_id: attemptId, question_id: answer.questionId,
          question_prompt: answer.prompt, question_type: answer.type,
          selected_option_text: answer.selectedText, correct_option_text: answer.correctText,
          is_correct: answer.correct, points_awarded: answer.awarded,
        })), { transaction });
      }
      return {
        attemptId,
        attemptNumber: attemptsUsed + 1,
        score,
        earnedPoints,
        totalPoints,
        passed,
        passingScore: Number(exam.passing_score),
        maxAttempts: null,
        unlimitedAttempts: true,
        answers: Boolean(exam.show_answers_after_submit) ? graded : graded.map(({ correct, awarded, points }) => ({ correct, awarded, points })),
      };
    });
  }
}

export default new ExamsRepository();
