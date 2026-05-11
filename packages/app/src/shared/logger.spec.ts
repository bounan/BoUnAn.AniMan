import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('createLogger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('emits structured JSON logs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-11T12:34:56.000Z'));

    const consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { createLogger } = await import('./logger');

    const log = createLogger('scope/test');
    log.info('hello world', { requestId: 'abc', count: 3 });

    expect(consoleLogMock).toHaveBeenCalledTimes(1);

    const entry = JSON.parse(consoleLogMock.mock.calls[0][0] as string) as {
      timestamp: string;
      level: string;
      message: string;
      scope: string;
      fields: Record<string, unknown>;
    };

    expect(entry).toEqual({
      timestamp: '2026-05-11T12:34:56.000Z',
      level: 'info',
      message: 'hello world',
      scope: 'scope/test',
      fields: {
        requestId: 'abc',
        count: 3,
      },
    });
  });

  it('serializes Error objects on error level', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-11T12:35:00.000Z'));

    const consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { createLogger } = await import('./logger');

    const log = createLogger('scope/test');
    log.error('operation failed', new TypeError('boom'));

    const entry = JSON.parse(consoleLogMock.mock.calls[0][0] as string) as {
      timestamp: string;
      level: string;
      message: string;
      scope: string;
      fields?: Record<string, unknown>;
      error: {
        name?: string;
        message: string;
      };
    };

    expect(entry.timestamp).toBe('2026-05-11T12:35:00.000Z');
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('operation failed');
    expect(entry.scope).toBe('scope/test');
    expect(entry.fields).toBeUndefined();
    expect(entry.error.name).toBe('TypeError');
    expect(entry.error.message).toBe('boom');
  });

  it('serializes non-Error values passed to error level', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-11T12:36:00.000Z'));

    const consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { createLogger } = await import('./logger');

    const log = createLogger('scope/test');
    log.error('operation failed', 'boom-string');

    const entry = JSON.parse(consoleLogMock.mock.calls[0][0] as string) as {
      timestamp: string;
      level: string;
      message: string;
      scope: string;
      fields?: Record<string, unknown>;
      error: {
        name?: string;
        message: string;
      };
    };

    expect(entry.timestamp).toBe('2026-05-11T12:36:00.000Z');
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('operation failed');
    expect(entry.scope).toBe('scope/test');
    expect(entry.fields).toBeUndefined();
    expect(entry.error.name).toBeUndefined();
    expect(entry.error.message).toBe('boom-string');
  });
});


