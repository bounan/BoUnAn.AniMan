import { beforeEach, describe, expect, it, vi } from 'vitest';

const initConfigMock = vi.hoisted(() => vi.fn());
const retryMock = vi.hoisted(() => vi.fn(async (operation: () => Promise<unknown>) => operation()));
const getEpisodeToDownloadAndLockMock = vi.hoisted(() => vi.fn());

vi.mock('../../config/config', () => ({
  initConfig: initConfigMock,
}));

vi.mock('../../../../../third-party/common/ts/runtime/retry', () => ({
  retry: retryMock,
}));

vi.mock('./repository', () => ({
  getEpisodeToDownloadAndLock: getEpisodeToDownloadAndLockMock,
}));

describe('packages/app/src/handlers/get-video-to-download/handler.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    initConfigMock.mockReset().mockResolvedValue(undefined);
    retryMock.mockReset().mockImplementation(async (operation: () => Promise<unknown>) => operation());
    getEpisodeToDownloadAndLockMock.mockReset();
  });

  it('initializes config, locks one video and returns downloader response', async () => {
    getEpisodeToDownloadAndLockMock.mockResolvedValue({ myAnimeListId: 55, dub: 'Dub', episode: 9 });

    const module = await import('./handler');
    const result = await module.handler(undefined, null as never, null as never);

    expect(result).toEqual({
      videoKey: { myAnimeListId: 55, dub: 'Dub', episode: 9 },
    });
    expect(initConfigMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledWith(expect.any(Function), 3);
    expect(getEpisodeToDownloadAndLockMock).toHaveBeenCalledTimes(1);
  });
});
