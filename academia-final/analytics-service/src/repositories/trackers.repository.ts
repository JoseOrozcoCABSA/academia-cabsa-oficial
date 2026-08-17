import { AiTrackersRepository } from './ai-trackers.repository.js';
import { CapsuleTrackersRepository } from './capsule-trackers.repository.js';
import { CourseTrackersRepository } from './course-trackers.repository.js';
import type { TrackerFilters } from './trackers-query-context.js';

export type { TrackerFilters } from './trackers-query-context.js';

export class TrackersRepository {
  constructor(
    private readonly aiRepository = new AiTrackersRepository(),
    private readonly capsuleRepository = new CapsuleTrackersRepository(),
    private readonly courseRepository = new CourseTrackersRepository(),
  ) {}

  recordPlatformEvent(input: Parameters<AiTrackersRepository['recordPlatformEvent']>[0]) {
    return this.aiRepository.recordPlatformEvent(input);
  }

  recordAiEvent(input: Parameters<AiTrackersRepository['recordAiEvent']>[0]) {
    return this.aiRepository.recordAiEvent(input);
  }

  ai(filters: TrackerFilters) {
    return this.aiRepository.ai(filters);
  }

  capsules(filters: TrackerFilters) {
    return this.capsuleRepository.capsules(filters);
  }

  courses(filters: TrackerFilters) {
    return this.courseRepository.courses(filters);
  }
}

export default new TrackersRepository();
