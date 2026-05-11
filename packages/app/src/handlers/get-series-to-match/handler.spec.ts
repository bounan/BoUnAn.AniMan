import { beforeEach, describe, expect, it, vi } from 'vitest';

const initConfigMock = vi.hoisted(() => vi.fn());
const retryMock = vi.hoisted(() => vi.fn(async (operation: () => Promise<unknown>) => operation()));
const getEpisodesToMatchMock = vi.hoisted(() => vi.fn());

vi.mock('../../config/config', () => ({
  initConfig: initConfigMock,
}));

vi.mock('../../../../../third-party/common/ts/runtime/retry', () => ({
  retry: retryMock,
}));

vi.mock('./repository', () => ({
  getEpisodesToMatch: getEpisodesToMatchMock,
}));

describe('packages/app/src/handlers/get-series-to-match/handler.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    initConfigMock.mockReset().mockResolvedValue(undefined);
    retryMock.mockReset().mockImplementation(async (operation: () => Promise<unknown>) => operation());
    getEpisodesToMatchMock.mockReset();
  });

  it('initializes config, loads episodes and returns matcher response', async () => {
    getEpisodesToMatchMock.mockResolvedValue([
      { myAnimeListId: 10, dub: 'Dub', episode: 3 },
      { myAnimeListId: 11, dub: 'Sub', episode: 1 },
    ]);

    const module = await import('./handler');
    const result = await module.handler(undefined, null as never, null as never);

    expect(result).toEqual({
      videosToMatch: [
        { myAnimeListId: 10, dub: 'Dub', episode: 3 },
        { myAnimeListId: 11, dub: 'Sub', episode: 1 },
      ],
    });
    expect(initConfigMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledWith(expect.any(Function), 3);
    expect(getEpisodesToMatchMock).toHaveBeenCalledTimes(1);
  });
});
