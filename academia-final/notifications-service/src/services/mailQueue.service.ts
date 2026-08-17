import { randomUUID } from 'node:crypto';
import { QueryTypes, type Transaction } from 'sequelize';
import database from '#config/database';
import logger from '#config/logger';
import { sendMail, type MailMessage } from '#services/mailer.service';

interface QueueRow {
  id: string;
  payload: string | MailMessage;
  attempts: number;
}

const workerId = `${process.pid}-${randomUUID().slice(0, 8)}`;
let timer: NodeJS.Timeout | null = null;
let processing = false;

export async function initializeMailQueue(): Promise<void> {
  await database.query(`
    CREATE TABLE IF NOT EXISTS notificaciones_cola_correos (
      id CHAR(36) NOT NULL,
      kind VARCHAR(50) NOT NULL,
      recipient VARCHAR(320) NOT NULL,
      payload JSON NOT NULL,
      status ENUM('PENDING','PROCESSING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      locked_at DATETIME NULL,
      locked_by VARCHAR(80) NULL,
      message_id VARCHAR(255) NULL,
      last_error VARCHAR(1000) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME NULL,
      PRIMARY KEY (id),
      KEY mail_queue_claim_idx (status, available_at, created_at),
      KEY mail_queue_recipient_idx (recipient, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await database.query(`
    UPDATE notificaciones_cola_correos
    SET status='PENDING', locked_at=NULL, locked_by=NULL
    WHERE status='PROCESSING' AND locked_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
  `);
}

export async function enqueueMail(kind: string, message: MailMessage): Promise<string> {
  if (message.attachments?.length) {
    throw new Error('La cola transaccional no admite adjuntos; use almacenamiento de objetos');
  }
  const id = randomUUID();
  await database.query(
    `INSERT INTO notificaciones_cola_correos
     (id,kind,recipient,payload,status,attempts,available_at,created_at)
     VALUES (:id,:kind,:recipient,:payload,'PENDING',0,NOW(),NOW())`,
    {
      replacements: {
        id,
        kind: kind.slice(0, 50),
        recipient: message.to.slice(0, 320),
        payload: JSON.stringify(message),
      },
      type: QueryTypes.INSERT,
    },
  );
  return id;
}

async function claimBatch(transaction: Transaction): Promise<QueueRow[]> {
  const rows = await database.query<QueueRow>(
    `SELECT id,payload,attempts
     FROM notificaciones_cola_correos
     WHERE status='PENDING' AND available_at<=NOW()
     ORDER BY created_at
     LIMIT 5
     FOR UPDATE SKIP LOCKED`,
    { type: QueryTypes.SELECT, transaction },
  );
  if (!rows.length) return rows;
  await database.query(
    `UPDATE notificaciones_cola_correos
     SET status='PROCESSING',locked_at=NOW(),locked_by=:workerId
     WHERE id IN (:ids)`,
    {
      replacements: { workerId, ids: rows.map((row) => row.id) },
      type: QueryTypes.UPDATE,
      transaction,
    },
  );
  return rows;
}

async function markSent(id: string, messageId: string): Promise<void> {
  await database.query(
    `UPDATE notificaciones_cola_correos
     SET status='SENT',message_id=:messageId,sent_at=NOW(),
         locked_at=NULL,locked_by=NULL,last_error=NULL
     WHERE id=:id AND locked_by=:workerId`,
    {
      replacements: { id, workerId, messageId: messageId.slice(0, 255) },
      type: QueryTypes.UPDATE,
    },
  );
}

async function markFailed(row: QueueRow, error: unknown): Promise<void> {
  const attempts = Number(row.attempts) + 1;
  const status = attempts >= 5 ? 'FAILED' : 'PENDING';
  const delayMinutes = Math.min(2 ** attempts, 60);
  await database.query(
    `UPDATE notificaciones_cola_correos
     SET status=:status,attempts=:attempts,
         available_at=DATE_ADD(NOW(), INTERVAL :delayMinutes MINUTE),
         locked_at=NULL,locked_by=NULL,last_error=:lastError
     WHERE id=:id AND locked_by=:workerId`,
    {
      replacements: {
        id: row.id,
        workerId,
        status,
        attempts,
        delayMinutes,
        lastError: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
      },
      type: QueryTypes.UPDATE,
    },
  );
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    const rows = await database.transaction((transaction) => claimBatch(transaction));
    await Promise.all(rows.map(async (row) => {
      try {
        const message = typeof row.payload === 'string'
          ? JSON.parse(row.payload) as MailMessage
          : row.payload;
        const result = await sendMail(message);
        await markSent(row.id, result.messageId);
      } catch (error) {
        logger.error('No fue posible enviar un correo en cola', {
          queueId: row.id,
          error: error instanceof Error ? error.message : String(error),
        });
        await markFailed(row, error);
      }
    }));
  } catch (error) {
    logger.error('No fue posible procesar la cola de correo', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    processing = false;
  }
}

export function startMailWorker(): void {
  if (timer) return;
  timer = setInterval(() => void processQueue(), 1000);
  timer.unref();
  void processQueue();
  logger.info('Trabajador de correo transaccional iniciado', { workerId });
}
