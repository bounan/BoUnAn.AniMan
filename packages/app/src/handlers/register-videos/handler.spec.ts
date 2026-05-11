import { beforeEach, describe, expect, it, vi } from 'vitest';

const initConfigMock = vi.hoisted(() => vi.fn());
const retryMock = vi.hoisted(() => vi.fn(async (operation: () => Promise<unknown>) => operation()));
const insertVideoMock = vi.hoisted(() => vi.fn());
const getExistingVideosMock = vi.hoisted(() => vi.fn());
const sendVideoRegisteredNotificationMock = vi.hoisted(() => vi.fn());

vi.mock('../../config/config', () => ({
  initConfig: initConfigMock,
}));

vi.mock('../../../../../third-party/common/ts/runtime/retry', () => ({
  retry: retryMock,
}));

vi.mock('../../shared/repository', () => ({
  insertVideo: insertVideoMock,
}));

vi.mock('./repository', () => ({
  getExistingVideos: getExistingVideosMock,
}));

vi.mock('./sns-client', () => ({
  sendVideoRegisteredNotification: sendVideoRegisteredNotificationMock,
}));

describe('packages/app/src/handlers/register-videos/handler.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    initConfigMock.mockReset().mockResolvedValue(undefined);
    retryMock.mockReset().mockImplementation(async (operation: () => Promise<unknown>) => operation());
    insertVideoMock.mockReset().mockResolvedValue(undefined);
    getExistingVideosMock.mockReset();
    sendVideoRegisteredNotificationMock.mockReset().mockResolvedValue(undefined);
  });

  it('throws on invalid request and skips retry', async () => {
    const module = await import('./handler');

    await expect(module.handler({ items: [] }, null as never, null as never)).rejects.toThrow('Invalid request');

    expect(initConfigMock).toHaveBeenCalledTimes(1);
    expect(retryMock).not.toHaveBeenCalled();
    expect(getExistingVideosMock).not.toHaveBeenCalled();
  });

  it('short-circuits when all requested videos already exist', async () => {
    const request = {
      items: [
        { videoKey: { myAnimeListId: 10, dub: 'Dub', episode: 1 } },
        { videoKey: { myAnimeListId: 10, dub: 'Dub', episode: 2 } },
      ],
    };
    getExistingVideosMock.mockResolvedValue([
      { myAnimeListId: 10, dub: 'Dub', episode: 1 },
      { myAnimeListId: 10, dub: 'Dub', episode: 2 },
    ]);

    const module = await import('./handler');
    await module.handler(request, null as never, null as never);

    expect(initConfigMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(getExistingVideosMock).toHaveBeenCalledWith([
      { myAnimeListId: 10, dub: 'Dub', episode: 1 },
      { myAnimeListId: 10, dub: 'Dub', episode: 2 },
    ]);
    expect(insertVideoMock).not.toHaveBeenCalled();
    expect(sendVideoRegisteredNotificationMock).not.toHaveBeenCalled();
  });

  it('registers and notifies only videos that are missing', async () => {
    const request = {
      items: [
        { videoKey: { myAnimeListId: 20, dub: 'Sub', episode: 1 } },
        { videoKey: { myAnimeListId: 20, dub: 'Sub', episode: 2 } },
        { videoKey: { myAnimeListId: 20, dub: 'Sub', episode: 3 } },
      ],
    };
    getExistingVideosMock.mockResolvedValue([
      { myAnimeListId: 20, dub: 'Sub', episode: 2 },
    ]);

    const module = await import('./handler');
    await module.handler(request, null as never, null as never);

    const expected = [
      { myAnimeListId: 20, dub: 'Sub', episode: 1 },
      { myAnimeListId: 20, dub: 'Sub', episode: 3 },
    ];
    expect(insertVideoMock).toHaveBeenCalledTimes(1);
    expect(insertVideoMock).toHaveBeenCalledWith(expected);
    expect(sendVideoRegisteredNotificationMock).toHaveBeenCalledTimes(1);
    expect(sendVideoRegisteredNotificationMock).toHaveBeenCalledWith(expected);
  });
});
