import { DataTypes, Model } from 'sequelize';
import database from '#config/database';

export class Exam extends Model {}
Exam.init({
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  lesson_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: DataTypes.TEXT,
  passing_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  max_attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  shuffle_questions: { type: DataTypes.BOOLEAN, allowNull: false },
  show_answers_after_submit: { type: DataTypes.BOOLEAN, allowNull: false },
  status: { type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'), allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
}, { sequelize: database, tableName: 'academia_examenes', modelName: 'Exam', timestamps: false });

export class ExamQuestion extends Model {}
ExamQuestion.init({
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  exam_id: { type: DataTypes.CHAR(36), allowNull: false },
  question_type: { type: DataTypes.ENUM('MULTIPLE_CHOICE', 'TRUE_FALSE'), allowNull: false },
  prompt: { type: DataTypes.TEXT, allowNull: false },
  explanation: DataTypes.TEXT,
  points: { type: DataTypes.DECIMAL(7, 2), allowNull: false },
  position: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  is_required: { type: DataTypes.BOOLEAN, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
}, { sequelize: database, tableName: 'academia_examen_preguntas', modelName: 'ExamQuestion', timestamps: false });

export class ExamOption extends Model {}
ExamOption.init({
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  question_id: { type: DataTypes.CHAR(36), allowNull: false },
  option_text: { type: DataTypes.TEXT, allowNull: false },
  is_correct: { type: DataTypes.BOOLEAN, allowNull: false },
  position: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
}, { sequelize: database, tableName: 'academia_examen_opciones', modelName: 'ExamOption', timestamps: false });

export class ExamAttempt extends Model {}
ExamAttempt.init({
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  exam_id: { type: DataTypes.CHAR(36), allowNull: false },
  user_id: { type: DataTypes.CHAR(36), allowNull: false },
  attempt_number: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  earned_points: { type: DataTypes.DECIMAL(9, 2), allowNull: false },
  total_points: { type: DataTypes.DECIMAL(9, 2), allowNull: false },
  passed: { type: DataTypes.BOOLEAN, allowNull: false },
  started_at: { type: DataTypes.DATE, allowNull: false },
  submitted_at: { type: DataTypes.DATE, allowNull: false },
}, { sequelize: database, tableName: 'academia_examen_intentos', modelName: 'ExamAttempt', timestamps: false });

export class ExamAnswer extends Model {}
ExamAnswer.init({
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  attempt_id: { type: DataTypes.CHAR(36), allowNull: false },
  question_id: { type: DataTypes.CHAR(36), allowNull: true },
  question_prompt: { type: DataTypes.TEXT, allowNull: false },
  question_type: { type: DataTypes.STRING(30), allowNull: false },
  selected_option_text: DataTypes.TEXT,
  correct_option_text: { type: DataTypes.TEXT, allowNull: false },
  is_correct: { type: DataTypes.BOOLEAN, allowNull: false },
  points_awarded: { type: DataTypes.DECIMAL(9, 2), allowNull: false },
}, { sequelize: database, tableName: 'academia_examen_respuestas', modelName: 'ExamAnswer', timestamps: false });

Exam.hasMany(ExamQuestion, { foreignKey: 'exam_id', as: 'questions' });
ExamQuestion.belongsTo(Exam, { foreignKey: 'exam_id', as: 'exam' });
ExamQuestion.hasMany(ExamOption, { foreignKey: 'question_id', as: 'options' });
ExamOption.belongsTo(ExamQuestion, { foreignKey: 'question_id', as: 'question' });
Exam.hasMany(ExamAttempt, { foreignKey: 'exam_id', as: 'attempts' });
ExamAttempt.belongsTo(Exam, { foreignKey: 'exam_id', as: 'exam' });
ExamAttempt.hasMany(ExamAnswer, { foreignKey: 'attempt_id', as: 'answers' });
ExamAnswer.belongsTo(ExamAttempt, { foreignKey: 'attempt_id', as: 'attempt' });
