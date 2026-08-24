import type { Transaction } from 'sequelize';
import database from '#config/database';
import { TeacherGroupQueriesRepository } from './teacher-group-queries.repository.js';
import { TeacherGroupMembersRepository } from './teacher-group-members.repository.js';
import { ScholarshipActivationRepository } from './scholarship-activation.repository.js';
import { StudentProgressRepository } from './student-progress.repository.js';

export type { ManagedGroup, SponsorPolicy, TeacherScholarship } from './teacher-groups.types.js';

export class TeacherGroupsRepository {
  constructor(
    private readonly queries = new TeacherGroupQueriesRepository(),
    private readonly members = new TeacherGroupMembersRepository(),
    private readonly scholarships = new ScholarshipActivationRepository(),
    private readonly progress = new StudentProgressRepository(),
  ) {}

  transaction<T>(callback: (transaction: Transaction) => Promise<T>) {
    return database.transaction(callback);
  }

  authorization(...args: Parameters<TeacherGroupQueriesRepository['authorization']>) {
    return this.queries.authorization(...args);
  }

  ensureSponsorGroup(...args: Parameters<TeacherGroupQueriesRepository['ensureSponsorGroup']>) {
    return this.queries.ensureSponsorGroup(...args);
  }

  groupsFor(...args: Parameters<TeacherGroupQueriesRepository['groupsFor']>) {
    return this.queries.groupsFor(...args);
  }

  canManageGroup(...args: Parameters<TeacherGroupQueriesRepository['canManageGroup']>) {
    return this.queries.canManageGroup(...args);
  }

  students(...args: Parameters<TeacherGroupQueriesRepository['students']>) {
    return this.queries.students(...args);
  }

  groupHistory(...args: Parameters<TeacherGroupQueriesRepository['groupHistory']>) {
    return this.queries.groupHistory(...args);
  }

  studentProgress(...args: Parameters<StudentProgressRepository['report']>) {
    return this.progress.report(...args);
  }

  lockManagedGroup(...args: Parameters<TeacherGroupQueriesRepository['lockManagedGroup']>) {
    return this.queries.lockManagedGroup(...args);
  }

  findAccount(...args: Parameters<TeacherGroupMembersRepository['findAccount']>) {
    return this.members.findAccount(...args);
  }

  lockSponsorPolicy(...args: Parameters<TeacherGroupMembersRepository['lockSponsorPolicy']>) {
    return this.members.lockSponsorPolicy(...args);
  }

  findStudentInGroup(...args: Parameters<TeacherGroupMembersRepository['findStudentInGroup']>) {
    return this.members.findStudentInGroup(...args);
  }

  grantStudentScholarship(...args: Parameters<TeacherGroupMembersRepository['grantStudentScholarship']>) {
    return this.members.grantStudentScholarship(...args);
  }

  createStudent(...args: Parameters<TeacherGroupMembersRepository['createStudent']>) {
    return this.members.createStudent(...args);
  }

  updateStudentStatus(...args: Parameters<TeacherGroupMembersRepository['updateStudentStatus']>) {
    return this.members.updateStudentStatus(...args);
  }

  updateStudentAccount(...args: Parameters<TeacherGroupMembersRepository['updateStudentAccount']>) {
    return this.members.updateStudentAccount(...args);
  }

  removeStudentFromGroup(...args: Parameters<TeacherGroupMembersRepository['removeStudentFromGroup']>) {
    return this.members.removeStudentFromGroup(...args);
  }

  restoreStudentToGroup(...args: Parameters<TeacherGroupMembersRepository['restoreStudentToGroup']>) {
    return this.members.restoreStudentToGroup(...args);
  }

  lockScholarshipCode(...args: Parameters<ScholarshipActivationRepository['lockScholarshipCode']>) {
    return this.scholarships.lockScholarshipCode(...args);
  }

  activationForUser(...args: Parameters<ScholarshipActivationRepository['activationForUser']>) {
    return this.scholarships.activationForUser(...args);
  }

  activateScholarship(...args: Parameters<ScholarshipActivationRepository['activateScholarship']>) {
    return this.scholarships.activateScholarship(...args);
  }

  cancelScholarship(...args: Parameters<ScholarshipActivationRepository['cancelScholarship']>) {
    return this.scholarships.cancelScholarship(...args);
  }

}

export default new TeacherGroupsRepository();
