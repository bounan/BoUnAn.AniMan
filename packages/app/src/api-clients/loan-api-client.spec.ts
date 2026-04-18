import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeLambdaRequestMock = vi.fn();
const asyncMemoizedMock = vi.fn(<T extends (...args: never[]) => unknown>(_prefix: string, fn: T) => fn);

vi.mock('../../../../third-party/common/ts/runtime/lambda-client', () => ({
  makeLambdaRequest: makeLambdaRequestMock,
}));

vi.mock('../../../../third-party/common/ts/runtime/memorized', () => ({
  asyncMemoized: asyncMemoizedMock,
}));

describe('packages/app/src/api-clients/loan-api-client.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    makeLambdaRequestMock.mockReset();
    asyncMemoizedMock.mockClear();
  });

  it('wraps the lambda client with the configured arn', async () => {
    makeLambdaRequestMock.mockResolvedValue([1, 2, 3]);

    const configModule = await import('../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        loanApiConfig: { functionArn: 'arn:loan-api' },
      }),
    });

    const { getEpisodes } = await import('./loan-api-client');

    await expect(getEpisodes(15, 'AniLibria')).resolves.toEqual([1, 2, 3]);
    expect(asyncMemoizedMock).toHaveBeenCalledWith('getEpisodes', expect.any(Function));
    expect(makeLambdaRequestMock).toHaveBeenCalledWith('arn:loan-api', {
      myAnimeListId: 15,
      dub: 'AniLibria',
    });
  });
});
