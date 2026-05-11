import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSsmValueMock = vi.fn();

vi.mock('../../../../third-party/common/ts/runtime/ssm-client', () => ({
  fetchSsmValue: fetchSsmValueMock,
}));

describe('packages/app/src/config/config.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchSsmValueMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws when accessed before initialization', async () => {
    const module = await import('./config');
    expect(() => module.config.value).toThrow('Config not initialized');
  });

  it('loads and exposes remote config', async () => {
    const value = {
      loanApiConfig: { functionArn: 'arn:test' },
      database: {
        tableName: 'videos',
        animeKeyIndexName: 'anime',
        secondaryIndexName: 'download',
        matcherSecondaryIndexName: 'matcher',
      },
      topics: {
        videoRegisteredTopicArn: 'arn:registered',
        videoDownloadedTopicArn: 'arn:downloaded',
        sceneRecognisedTopicArn: 'arn:scene',
      },
      downloadRetry: {
        maxAttempts: 5,
        retryDelayMs: 60 * 60 * 1000,
      },
      matchingRetry: {
        maxAttempts: 5,
        retryDelayMs: 60 * 60 * 1000,
      },
    };
    fetchSsmValueMock.mockResolvedValue(value);

    const module = await import('./config');
    await module.initConfig();

    expect(fetchSsmValueMock).toHaveBeenCalledWith('/bounan/animan/runtime-config');
    expect(module.config.value).toEqual(value);
  });
});
