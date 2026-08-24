import type { Request, Response } from 'express';
import service from '#services/teacher-groups.service';
import { AppError } from '#utils/errors';
import { ok } from '#utils/response';

const userId = (request: Request) => {
  const subject = request.auth?.sub;
  if (!subject) throw new AppError('Token requerido', 401, 'INVALID_TOKEN_SUBJECT');
  return String(subject);
};

export class TeacherGroupsController {
  overview = async (request: Request, response: Response) => {
    ok(response, await service.overview(userId(request), request.query));
  };

  studentProgress = async (request: Request, response: Response) => {
    ok(response, await service.studentProgress(
      userId(request),
      request.query.groupId,
      String(request.params.studentId),
    ));
  };

  createStudent = async (request: Request, response: Response) => {
    ok(response, await service.createStudent(userId(request), request.body), 201);
  };

  setStudentStatus = async (request: Request, response: Response) => {
    ok(response, await service.setStudentStatus(
      userId(request),
      request.body.groupId,
      String(request.params.studentId),
      request.body.status,
    ));
  };

  updateStudent = async (request: Request, response: Response) => {
    ok(response, await service.updateStudent(
      userId(request),
      String(request.params.studentId),
      request.body,
    ));
  };

  removeStudent = async (request: Request, response: Response) => {
    ok(response, await service.removeStudent(
      userId(request),
      request.body.groupId,
      String(request.params.studentId),
    ));
  };

  restoreStudent = async (request: Request, response: Response) => {
    ok(response, await service.restoreStudent(
      userId(request),
      request.body.groupId,
      String(request.params.studentId),
    ));
  };

  assignStudentScholarship = async (request: Request, response: Response) => {
    ok(response, await service.assignStudentScholarship(
      userId(request),
      request.body.groupId,
      String(request.params.studentId),
    ));
  };

  activateScholarship = async (request: Request, response: Response) => {
    ok(response, await service.activateScholarship(userId(request), request.body.code));
  };

  cancelScholarship = async (request: Request, response: Response) => {
    ok(response, await service.cancelScholarship(userId(request)));
  };

}

export default new TeacherGroupsController();
