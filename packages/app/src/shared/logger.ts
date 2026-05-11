type LogLevel = 'info' | 'warn' | 'error';

type LoggerFields = Record<string, unknown>;

type SerializedError = {
  name?: string;
  message: string;
  stack?: string;
};

type JsonLogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  scope?: string;
  fields?: LoggerFields;
  error?: SerializedError;
};

const serializeError = (error: unknown): SerializedError => {
  return error instanceof Error
    ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
    : { message: String(error) };
};

const write = (entry: JsonLogEntry): void => {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
};

const log = (scope: string, level: LogLevel, message: string, fields?: LoggerFields): void => {
  const entry: JsonLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    scope,
  };

  if (fields && Object.keys(fields).length > 0) {
    const { error, ...rest } = fields;

    if (Object.keys(rest).length > 0) {
      entry.fields = rest;
    }

    if (error !== undefined) {
      entry.error = serializeError(error);
    }
  }

  write(entry);
};

export const createLogger = (scope: string) => ({
  info: (message: string, fields?: LoggerFields) => log(scope, 'info', message, fields),
  warn: (message: string, fields?: LoggerFields) => log(scope, 'warn', message, fields),
  error: (message: string, error?: unknown, fields?: LoggerFields) =>
    log(scope, 'error', message, { ...fields, error }),
});

