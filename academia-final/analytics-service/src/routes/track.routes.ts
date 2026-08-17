import { Router } from 'express';
import { trackAi, trackPlatform } from '#controllers/trackers.controller';

const router = Router();
router.post('/ai', trackAi);
router.post('/platform', trackPlatform);
export default router;
