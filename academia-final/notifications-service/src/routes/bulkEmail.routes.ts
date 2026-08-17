import { Router } from 'express';
import multer from 'multer';
import authMiddleware from '#middlewares/auth.middleware';
import { allowRoles } from '#middlewares/role.middleware';
import { sendBulkEmail } from '#controllers/bulkEmail.controller';

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});

const router = Router();
router.post(
  '/send-batch',
  authMiddleware,
  allowRoles('ADMIN', 'SUPER_ADMIN', 'administrator'),
  upload.array('attachments', 5),
  sendBulkEmail,
);
export default router;
