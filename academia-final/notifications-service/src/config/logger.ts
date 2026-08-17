/**
 * Registro JSON no bloqueante y apto para contenedores.
 *
 * stdout/stderr son capturados por systemd, Docker o Kubernetes. Esto evita
 * escrituras sincronas por peticion, archivos sin rotacion y discos distintos
 * entre replicas.
 */

type Metadata = Record<string, unknown>;

const write = (
  level: 'info' | 'error' | 'audit',
  message: string,
  metadata: Metadata = {},
): void => {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata,
  });
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
};

const logger = {
  info: (message: string, metadata?: Metadata): void =>
    write('info', message, metadata),
  error: (message: string, metadata?: Metadata): void =>
    write('error', message, metadata),
  audit: (message: string, metadata?: Metadata): void =>
    write('audit', message, metadata),
};

export default logger;
