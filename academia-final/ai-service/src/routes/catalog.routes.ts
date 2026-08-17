import { Router } from 'express';
import { assistantTutorLinks } from '#controllers/catalog.controller';

const router = Router();

router.get('/assistant-tutor-links', assistantTutorLinks);

export default router;

