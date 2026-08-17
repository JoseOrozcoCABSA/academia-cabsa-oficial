import { randomUUID } from 'node:crypto';
import repository from '#repositories/teacher-groups.repository';
import profileRepository from '#repositories/profile.repository';
import { AppError } from '#utils/errors';
import { hashPassword } from '#utils/password';
import env from '#config/env';
import platformSettingsRepository from '#repositories/platform-settings.repository';

interface StudentInput {
  groupId?: number | string;
  fullName?: string;
  email?: string;
  username?: string;
  password?: string;
  passwordConfirmation?: string;
}

interface StudentUpdateInput {
  groupId?: number | string;
  fullName?: string;
  email?: string;
  username?: string;
  newPassword?: string;
  passwordConfirmation?: string;
}

interface GroupFilters {
  groupId?: unknown;
  page?: unknown;
  limit?: unknown;
  search?: unknown;
}

const normalizedCode = (value: unknown) => String(value ?? '')
  .trim()
  .toUpperCase()
  .replace(/[–—−]/g, '-')
  .replace(/[^A-Z0-9_-]/g, '');

const dateOnly = (value: Date | string | null) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const normalized = String(value).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
};

export class TeacherGroupsService {
  async studentProgress(userId: string, groupIdValue: unknown, studentId: string) {
    const groupId = Number(groupIdValue);
    if (!groupId || !studentId) {
      throw new AppError('Alumno o grupo inválido', 400, 'INVALID_STUDENT');
    }
    const authorization = await repository.authorization(userId);
    if (!authorization.isAdmin && !authorization.sponsorPolicy) {
      throw new AppError('Tu cuenta no puede consultar grupos', 403, 'GROUP_NOT_AUTHORIZED');
    }
    if (!authorization.isAdmin && !Number(authorization.sponsorPolicy?.allow_progress)) {
      throw new AppError('Este perfil de beca no permite consultar el progreso de dependientes', 403, 'PROGRESS_NOT_ALLOWED');
    }
    const managesGroup = await repository.canManageGroup(
      groupId,
      userId,
      authorization.isAdmin,
    );
    if (!managesGroup) {
      throw new AppError('No puedes administrar este grupo', 403, 'GROUP_NOT_AUTHORIZED');
    }
    const report = await repository.studentProgress(groupId, studentId);
    if (!report) throw new AppError('El alumno no pertenece a este grupo', 404, 'GROUP_STUDENT_NOT_FOUND');
    return this.formatStudentProgress(report);
  }

  private formatStudentProgress(report: Awaited<ReturnType<typeof repository.studentProgress>>) {
    if (!report) return report;
    const number = (value: unknown) => Number(value) || 0;
    const lessonsByEnrollment = new Map<string, typeof report.lessons>();
    report.lessons.forEach((lesson) => {
      const key = String(lesson.enrollment_id);
      lessonsByEnrollment.set(key, [...(lessonsByEnrollment.get(key) ?? []), lesson]);
    });
    const courses = report.courses.map((course) => {
      const lessons = lessonsByEnrollment.get(String(course.enrollment_id)) ?? [];
      return {
        ...course,
        status: String(course.status),
        last_activity: course.last_activity,
        progress_percent: number(course.progress_percent),
        total_lessons: lessons.length,
        completed_lessons: lessons.filter((lesson) => lesson.status === 'COMPLETED').length,
        study_seconds: lessons.reduce((sum, lesson) => sum + number(lesson.study_seconds), 0),
        exam_attempts: lessons.reduce((sum, lesson) => sum + number(lesson.exam_attempts), 0),
        exams_passed: lessons.filter((lesson) => number(lesson.exam_passed) === 1).length,
        lessons,
      };
    });
    const allLessons = courses.flatMap((course) => course.lessons);
    const totalStudySeconds = allLessons.reduce((sum, lesson) => sum + number(lesson.study_seconds), 0);
    const lastActivity = [
      report.student.last_login_at,
      report.learning.last_learning_activity,
      report.platform.last_platform_activity,
      report.forums.last_forum_activity,
      ...courses.map((course) => course.last_activity),
      ...report.recentActivity.map((activity) => activity.activity_at),
    ].filter(Boolean).sort((left, right) => new Date(String(right)).getTime() - new Date(String(left)).getTime())[0] ?? null;
    return {
      student: report.student,
      summary: {
        courses: courses.length,
        completedCourses: courses.filter((course) => course.status === 'COMPLETED').length,
        lessons: allLessons.length,
        completedLessons: allLessons.filter((lesson) => lesson.status === 'COMPLETED').length,
        totalStudySeconds,
        examAttempts: allLessons.reduce((sum, lesson) => sum + number(lesson.exam_attempts), 0),
        examsPassed: allLessons.filter((lesson) => number(lesson.exam_passed) === 1).length,
        capsules: number(report.learning.capsules),
        totalCapsules: number(report.learning.total_capsules),
        pendingCapsules: Math.max(0, number(report.learning.total_capsules) - number(report.learning.capsules)),
        greenCapsules: number(report.learning.green_capsules),
        yellowCapsules: number(report.learning.yellow_capsules),
        redCapsules: number(report.learning.red_capsules),
        xp: number(report.learning.xp),
        activeDays: number(report.learning.active_days),
        platformSeconds: number(report.platform.platform_seconds),
        platformSessions: number(report.platform.sessions),
        platformViews: number(report.platform.page_views),
        platformClicks: number(report.platform.clicks),
        platformActiveDays: number(report.platform.active_days),
        forumTopics: number(report.forums.topics),
        forumReplies: number(report.forums.replies),
        lastActivity,
      },
      courses,
      capsules: report.capsules,
      forumParticipated: number(report.forums.topics) + number(report.forums.replies) > 0,
    };
  }

  async overview(userId: string, filters: GroupFilters = {}) {
    const authorization = await repository.authorization(userId);
    if (!authorization.isAdmin && !authorization.sponsorPolicy) {
      return { canManage: false, groups: [] };
    }
    if (!authorization.isAdmin && authorization.sponsorPolicy) {
      await repository.ensureSponsorGroup(userId, authorization.sponsorPolicy);
    }
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
    const search = String(filters.search ?? '').trim().slice(0, 120);
    const { groups, total } = await repository.groupsFor(
      userId,
      authorization.isAdmin,
      { limit, offset: (page - 1) * limit, search },
    );
    const selectedGroupId = Number(filters.groupId) || Number(groups[0]?.id) || null;
    return {
      canManage: true,
      isAdmin: authorization.isAdmin,
      dependentLabel: authorization.sponsorPolicy?.dependent_label ?? 'Alumno',
      dependentMembership: authorization.sponsorPolicy?.dependent_name ?? null,
      progressEnabled: authorization.isAdmin || Boolean(Number(authorization.sponsorPolicy?.allow_progress)),
      selectedGroupId,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      groups: await Promise.all(groups.map(async (group) => ({
        id: Number(group.id),
        name: group.nombre,
        description: group.descripcion,
        seatLimit: Number(group.seat_limit),
        occupiedSeats: Number(group.occupied_seats),
        availableSeats: Math.max(
          0,
          Number(group.seat_limit) - Number(group.occupied_seats),
        ),
        students: Number(group.id) === selectedGroupId
          ? await repository.students(Number(group.id))
          : [],
        history: Number(group.id) === selectedGroupId
          ? await repository.groupHistory(Number(group.id))
          : [],
      }))),
    };
  }

  async createStudent(userId: string, input: StudentInput) {
    const groupId = Number(input.groupId);
    const fullName = input.fullName?.trim();
    const email = input.email?.trim().toLowerCase();
    const username = input.username?.trim().toLowerCase();
    if (!groupId || !fullName || fullName.length > 120) {
      throw new AppError('Captura el grupo y el nombre completo del alumno', 400, 'INVALID_STUDENT');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Captura un correo válido', 400, 'INVALID_STUDENT_EMAIL');
    }
    if (!username || !/^[a-z0-9._-]{3,100}$/.test(username)) {
      throw new AppError(
        'El usuario debe tener de 3 a 100 caracteres: letras, números, punto, guion o guion bajo',
        400,
        'INVALID_STUDENT_USERNAME',
      );
    }
    if (!input.password || input.password.length < 8) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres', 400, 'INVALID_STUDENT_PASSWORD');
    }
    if (input.password !== input.passwordConfirmation) {
      throw new AppError('La confirmación de contraseña no coincide', 400, 'PASSWORD_CONFIRMATION_MISMATCH');
    }

    const authorization = await repository.authorization(userId);
    if (!authorization.isAdmin && !authorization.sponsorPolicy) {
      throw new AppError('Tu cuenta no puede administrar grupos', 403, 'GROUP_NOT_AUTHORIZED');
    }
    const passwordHash = await hashPassword(input.password);
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts.shift() || fullName;
    const lastName = nameParts.join(' ') || null;
    const studentId = randomUUID();

    let scholarshipExpiresAt: Date | string | null = null;
    let scholarshipActivated = false;
    await repository.transaction(async (transaction) => {
      const group = await repository.lockManagedGroup(
        groupId,
        userId,
        authorization.isAdmin,
        transaction,
      );
      if (!group) {
        throw new AppError('No puedes administrar este grupo', 403, 'GROUP_NOT_AUTHORIZED');
      }
      if (Number(group.occupied_seats) >= Number(group.seat_limit)) {
        throw new AppError(
          `El grupo alcanzó su límite de ${group.seat_limit} alumnos`,
          422,
          'GROUP_SEAT_LIMIT',
        );
      }
      if ((await repository.findAccount(email, username, transaction)).length) {
        throw new AppError('El correo o nombre de usuario ya está registrado', 409, 'STUDENT_EXISTS');
      }
      const sponsorPolicy = authorization.sponsorPolicy
        ? await repository.lockSponsorPolicy(userId, transaction)
        : null;
      if (authorization.sponsorPolicy && !sponsorPolicy) {
        throw new AppError(
          'Necesitas una beca patrocinadora vigente para asignar beneficios a un dependiente',
          422,
          'SPONSOR_SCHOLARSHIP_REQUIRED',
        );
      }
      await repository.createStudent({
        id: studentId,
        email,
        username,
        passwordHash,
        displayName: fullName,
        firstName,
        lastName,
        groupId,
        creatorId: userId,
      }, transaction);
      if (sponsorPolicy) {
        scholarshipExpiresAt = Number(sponsorPolicy.inherit_expiry)
          ? sponsorPolicy.vigente_hasta
          : null;
        await repository.grantStudentScholarship(
          { id: studentId, email },
          groupId,
          userId,
          sponsorPolicy,
          scholarshipExpiresAt,
          transaction,
        );
        scholarshipActivated = true;
      }
    });
    return { created: true, studentId, scholarshipActivated, scholarshipExpiresAt };
  }

  async assignStudentScholarship(
    userId: string,
    groupIdValue: unknown,
    studentId: string,
  ) {
    const groupId = Number(groupIdValue);
    if (!groupId || !studentId) {
      throw new AppError('Alumno o grupo inválido', 400, 'INVALID_STUDENT');
    }
    const authorization = await repository.authorization(userId);
    if (!authorization.sponsorPolicy) {
      throw new AppError('Tu beca no incluye beneficios para dependientes', 403, 'SPONSOR_REQUIRED');
    }
    return repository.transaction(async (transaction) => {
      const group = await repository.lockManagedGroup(groupId, userId, false, transaction);
      if (!group) throw new AppError('No puedes administrar este grupo', 403, 'GROUP_NOT_AUTHORIZED');
      const sponsorPolicy = await repository.lockSponsorPolicy(userId, transaction);
      if (!sponsorPolicy) {
        throw new AppError('Tu beca patrocinadora no está vigente', 422, 'SPONSOR_SCHOLARSHIP_REQUIRED');
      }
      const student = await repository.findStudentInGroup(groupId, studentId, transaction);
      if (!student) throw new AppError('El alumno no pertenece a este grupo', 404, 'GROUP_STUDENT_NOT_FOUND');
      const result = await repository.grantStudentScholarship(
        student,
        groupId,
        userId,
        sponsorPolicy,
        Number(sponsorPolicy.inherit_expiry) ? sponsorPolicy.vigente_hasta : null,
        transaction,
      );
      return {
        ...result,
        scholarshipActivated: true,
        expiresAt: Number(sponsorPolicy.inherit_expiry) ? sponsorPolicy.vigente_hasta : null,
        membershipName: sponsorPolicy.dependent_name,
      };
    });
  }

  async setStudentStatus(
    userId: string,
    groupIdValue: unknown,
    studentId: string,
    statusValue: unknown,
  ) {
    const groupId = Number(groupIdValue);
    const status = String(statusValue).toUpperCase();
    if (!groupId || !['ACTIVE', 'SUSPENDED'].includes(status)) {
      throw new AppError('Estado de alumno inválido', 400, 'INVALID_STUDENT_STATUS');
    }
    const authorization = await repository.authorization(userId);
    return repository.transaction(async (transaction) => {
      const group = await repository.lockManagedGroup(
        groupId,
        userId,
        authorization.isAdmin,
        transaction,
      );
      if (!group) {
        throw new AppError('No puedes administrar este grupo', 403, 'GROUP_NOT_AUTHORIZED');
      }
      const updated = await repository.updateStudentStatus(
        groupId,
        studentId,
        status as 'ACTIVE' | 'SUSPENDED',
        userId,
        transaction,
      );
      if (!updated) {
        throw new AppError('Alumno no encontrado en tu grupo', 404, 'GROUP_STUDENT_NOT_FOUND');
      }
      return { updated: true };
    });
  }

  async updateStudent(userId: string, studentId: string, input: StudentUpdateInput) {
    const groupId = Number(input.groupId);
    const fullName = input.fullName?.trim();
    const email = input.email?.trim().toLowerCase();
    const username = input.username?.trim().toLowerCase();
    if (!groupId || !studentId || !fullName || fullName.length > 120) {
      throw new AppError('Captura un nombre válido para el alumno', 400, 'INVALID_STUDENT');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Captura un correo válido', 400, 'INVALID_STUDENT_EMAIL');
    }
    if (!username || !/^[a-z0-9._-]{3,100}$/.test(username)) {
      throw new AppError('El usuario debe tener de 3 a 100 caracteres válidos', 400, 'INVALID_STUDENT_USERNAME');
    }
    const wantsPasswordReset = Boolean(input.newPassword || input.passwordConfirmation);
    if (wantsPasswordReset) {
      if (!input.newPassword || input.newPassword.length < 10
        || !/[A-Za-z]/.test(input.newPassword) || !/\d/.test(input.newPassword)) {
        throw new AppError('La contraseña nueva debe tener al menos 10 caracteres, una letra y un número', 400, 'WEAK_STUDENT_PASSWORD');
      }
      if (input.newPassword !== input.passwordConfirmation) {
        throw new AppError('La confirmación de la contraseña no coincide', 400, 'PASSWORD_CONFIRMATION_MISMATCH');
      }
    }
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts.shift() || fullName;
    const lastName = nameParts.join(' ') || null;
    const passwordHash = wantsPasswordReset ? await hashPassword(input.newPassword!) : null;
    const authorization = await repository.authorization(userId);
    return repository.transaction(async (transaction) => {
      const group = await repository.lockManagedGroup(groupId, userId, authorization.isAdmin, transaction);
      if (!group) throw new AppError('No puedes administrar este grupo', 403, 'GROUP_NOT_AUTHORIZED');
      const updated = await repository.updateStudentAccount({
        groupId,
        studentId,
        performedBy: userId,
        fullName,
        firstName,
        lastName,
        email,
        username,
        passwordHash,
      }, transaction);
      if (updated === 'NOT_FOUND') {
        throw new AppError('Alumno no encontrado en el grupo', 404, 'GROUP_STUDENT_NOT_FOUND');
      }
      if (updated === 'DUPLICATE') {
        throw new AppError('El correo o nombre de usuario ya pertenece a otra cuenta', 409, 'STUDENT_EXISTS');
      }
      return {
        updated: true,
        passwordReset: wantsPasswordReset,
        student: { id: studentId, display_name: fullName, email, username },
        message: wantsPasswordReset
          ? 'Datos actualizados y nueva contraseña establecida. La contraseña anterior no se muestra ni se conserva.'
          : 'Los datos del alumno fueron actualizados.',
      };
    });
  }

  async removeStudent(userId: string, groupIdValue: unknown, studentId: string) {
    const groupId = Number(groupIdValue);
    if (!groupId || !studentId) {
      throw new AppError('Alumno o grupo inválido', 400, 'INVALID_STUDENT');
    }
    const authorization = await repository.authorization(userId);
    return repository.transaction(async (transaction) => {
      const group = await repository.lockManagedGroup(
        groupId,
        userId,
        authorization.isAdmin,
        transaction,
      );
      if (!group) throw new AppError('No puedes administrar este grupo', 403, 'GROUP_NOT_AUTHORIZED');
      const removed = await repository.removeStudentFromGroup(
        groupId,
        studentId,
        userId,
        transaction,
      );
      if (!removed) throw new AppError('El alumno ya no pertenece al grupo', 404, 'GROUP_STUDENT_NOT_FOUND');
      return {
        removed: true,
        accountPreserved: true,
        historyPreserved: true,
        message: 'El alumno fue retirado del grupo. Su cuenta, avances e historial permanecen guardados.',
      };
    });
  }

  async restoreStudent(userId: string, groupIdValue: unknown, studentId: string) {
    const groupId = Number(groupIdValue);
    if (!groupId || !studentId) {
      throw new AppError('Alumno o grupo inválido', 400, 'INVALID_STUDENT');
    }
    const authorization = await repository.authorization(userId);
    return repository.transaction(async (transaction) => {
      const group = await repository.lockManagedGroup(
        groupId,
        userId,
        authorization.isAdmin,
        transaction,
      );
      if (!group) throw new AppError('No puedes administrar este grupo', 403, 'GROUP_NOT_AUTHORIZED');
      if (Number(group.occupied_seats) >= Number(group.seat_limit)) {
        throw new AppError(
          `El grupo alcanzó su límite de ${group.seat_limit} alumnos`,
          422,
          'GROUP_SEAT_LIMIT',
        );
      }
      const restored = await repository.restoreStudentToGroup(
        groupId,
        studentId,
        userId,
        transaction,
      );
      if (!restored) throw new AppError('No existe una baja pendiente para este alumno', 404, 'GROUP_HISTORY_NOT_FOUND');
      return { restored: true, message: 'El alumno fue reincorporado al grupo.' };
    });
  }

  async activateScholarship(userId: string, codeValue: unknown) {
    const code = normalizedCode(codeValue);
    if (!code) {
      throw new AppError('Escribe un código de beca válido', 400, 'INVALID_SCHOLARSHIP_CODE');
    }
    const user = await profileRepository.findUserById(userId);
    if (!user) throw new AppError('Cuenta no encontrada', 404, 'USER_NOT_FOUND');
    const values = user.get({ plain: true }) as Record<string, unknown>;
    const email = String(values.email).trim().toLowerCase();
    const activated = await repository.transaction(async (transaction) => {
      const scholarship = await repository.lockScholarshipCode(code, transaction);
      if (!scholarship) {
        throw new AppError('El código de beca no existe', 404, 'SCHOLARSHIP_CODE_NOT_FOUND');
      }
      if (scholarship.allowed_email.trim().toLowerCase() !== email) {
        throw new AppError(
          'El código está asignado a otro correo. Inicia sesión con el correo correcto',
          422,
          'SCHOLARSHIP_EMAIL_MISMATCH',
        );
      }
      if (!scholarship.nivel_membresia_id) {
        throw new AppError('El código no tiene un nivel de beca asociado', 422, 'SCHOLARSHIP_LEVEL_MISSING');
      }
      if (scholarship.estado === 'REVOKED') {
        throw new AppError('Este código fue revocado por la administración', 409, 'SCHOLARSHIP_CODE_REVOKED');
      }
      if (
        scholarship.usado_por_user_id
        || Number(scholarship.usos_historicos) >= Number(scholarship.max_usos)
      ) {
        throw new AppError('Este código ya fue utilizado', 409, 'SCHOLARSHIP_CODE_USED');
      }
      const today = new Date();
      if (scholarship.vigente_desde && today < new Date(scholarship.vigente_desde)) {
        throw new AppError('Este código todavía no está vigente', 422, 'SCHOLARSHIP_NOT_STARTED');
      }
      if (scholarship.vigente_hasta) {
        const expires = new Date(scholarship.vigente_hasta);
        expires.setHours(23, 59, 59, 999);
        if (today > expires) {
          throw new AppError('Este código de beca ya venció', 422, 'SCHOLARSHIP_EXPIRED');
        }
      }
      const created = await repository.activateScholarship(
        userId,
        code,
        Number(scholarship.nivel_membresia_id),
        String(values.display_name),
        transaction,
      );
      if (!created) {
        throw new AppError(
          'La cuenta ya tiene una beca activa de este nivel',
          409,
          'SCHOLARSHIP_ALREADY_ACTIVE',
        );
      }
      return {
        activated: true,
        membershipLevelId: Number(scholarship.nivel_membresia_id),
        isTeacher: Number(scholarship.nivel_membresia_id) === 6,
        membershipName: scholarship.membership_name,
        expiresAt: dateOnly(scholarship.vigente_hasta),
      };
    });
    let emailSent = true;
    try {
      const response = await fetch(`${env.notificationsServiceUrl}/internal/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': env.internalServiceKey,
        },
        body: JSON.stringify({
          kind: 'SCHOLARSHIP_ACTIVATED',
          email,
          displayName: String(values.display_name),
          membershipName: activated.membershipName,
          expiresAt: activated.expiresAt,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`notifications-service HTTP ${response.status}`);
    } catch {
      emailSent = false;
    }
    return { ...activated, emailSent };
  }

  async cancelScholarship(userId: string) {
    if (!await platformSettingsRepository.scholarshipSelfCancellationEnabled()) {
      throw new AppError(
        'La cancelación de becas por el beneficiario está deshabilitada',
        403,
        'SCHOLARSHIP_SELF_CANCELLATION_DISABLED',
      );
    }
    const user = await profileRepository.findUserById(userId);
    if (!user) throw new AppError('Cuenta no encontrada', 404, 'USER_NOT_FOUND');
    const values = user.get({ plain: true }) as Record<string, unknown>;
    const result = await repository.cancelScholarship(
      userId,
      values.legacy_wp_user_id ? Number(values.legacy_wp_user_id) : null,
    );
    return {
      ...result,
      message: 'Tu beca fue cancelada. El código utilizado permanece en el historial.',
    };
  }

}

export default new TeacherGroupsService();
