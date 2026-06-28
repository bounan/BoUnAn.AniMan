import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VideoStatusNum } from '../../models/video-status-num';

const initConfigMock = vi.hoisted(() => vi.fn());
const retryMock = vi.hoisted(() => vi.fn(async (operation: () => Promise<unknown>) => operation()));
const getVideosByAnimeKeyMock = vi.hoisted(() => vi.fn());
const getVideosByVideoKeysMock = vi.hoisted(() => vi.fn());
const sendVideoDownloadedNotificationMock = vi.hoisted(() => vi.fn());

vi.mock('../../config/config', () => ({
  initConfig: initConfigMock,
}));

vi.mock('../../../../../third-party/common/ts/runtime/retry', () => ({
  retry: retryMock,
}));

vi.mock('./repository', () => ({
  getVideosByAnimeKey: getVideosByAnimeKeyMock,
  getVideosByVideoKeys: getVideosByVideoKeysMock,
}));

vi.mock('../update-video-status/sns-client', () => ({
  sendVideoDownloadedNotification: sendVideoDownloadedNotificationMock,
}));

describe('packages/app/src/handlers/manual-resend-downloaded-notifications/handler.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    initConfigMock.mockReset().mockResolvedValue(undefined);
    retryMock.mockReset().mockImplementation(async (operation: () => Promise<unknown>) => operation());
    getVideosByAnimeKeyMock.mockReset().mockResolvedValue([]);
    getVideosByVideoKeysMock.mockReset().mockResolvedValue([]);
    sendVideoDownloadedNotificationMock.mockReset().mockResolvedValue(undefined);
  });

  it('rejects non-array, empty, and malformed requests', async () => {
    const module = await import('./handler');

    await expect(module.handler({} as never, null as never, null as never)).rejects.toThrow('Assertion failed');
    await expect(module.handler([], null as never, null as never)).rejects.toThrow('Assertion failed');
    await expect(module.handler(['1'], null as never, null as never)).rejects.toThrow('Assertion failed');
    await expect(module.handler(['0#Dub'], null as never, null as never)).rejects.toThrow('Assertion failed');
    await expect(module.handler(['1##2'], null as never, null as never)).rejects.toThrow('Assertion failed');

    expect(initConfigMock).not.toHaveBeenCalled();
    expect(retryMock).not.toHaveBeenCalled();
  });

  it('throws before publishing when any requested key is not found', async () => {
    const module = await import('./handler');

    await expect(module.handler(['1#Dub#1'], null as never, null as never))
      .rejects.toThrow('Requested key was not found as downloaded');

    expect(getVideosByVideoKeysMock).toHaveBeenCalledWith([{ myAnimeListId: 1, dub: 'Dub', episode: 1 }]);
    expect(sendVideoDownloadedNotificationMock).not.toHaveBeenCalled();
  });

  it('throws before publishing when any requested video is not downloaded', async () => {
    getVideosByAnimeKeyMock.mockResolvedValue([
      {
        primaryKey: '1#Dub#1',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 1,
        status: VideoStatusNum.Downloaded,
      },
      {
        primaryKey: '1#Dub#2',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 2,
        status: VideoStatusNum.Pending,
      },
    ]);

    const module = await import('./handler');

    await expect(module.handler(['1#Dub'], null as never, null as never))
      .rejects.toThrow('Requested key was not found as downloaded');

    expect(sendVideoDownloadedNotificationMock).not.toHaveBeenCalled();
  });

  it('loads videos by string keys, deduplicates, and republishes downloaded notifications', async () => {
    const duplicateVideo = {
      primaryKey: '1#Dub#1',
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 1,
      status: VideoStatusNum.Downloaded,
      messageId: 11,
      scenes: { opening: { start: 10, end: 20 } },
      publishingDetails: { threadId: 100, messageId: 200 },
    };
    getVideosByAnimeKeyMock.mockResolvedValue([
      duplicateVideo,
      {
        primaryKey: '1#Dub#2',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 2,
        status: VideoStatusNum.Downloaded,
        messageId: 22,
      },
    ]);
    getVideosByVideoKeysMock.mockResolvedValue([
      duplicateVideo,
    ]);

    const module = await import('./handler');
    await module.handler(['1#Dub', '1#Dub#1'], null as never, null as never);

    expect(initConfigMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledTimes(0);
    expect(getVideosByAnimeKeyMock).toHaveBeenCalledWith({ myAnimeListId: 1, dub: 'Dub' });
    expect(getVideosByVideoKeysMock).toHaveBeenCalledWith([{ myAnimeListId: 1, dub: 'Dub', episode: 1 }]);
    expect(sendVideoDownloadedNotificationMock).toHaveBeenCalledTimes(2);
    expect(sendVideoDownloadedNotificationMock).toHaveBeenNthCalledWith(1, {
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
      messageId: 11,
      scenes: { opening: { start: 10, end: 20 } },
      publishingDetails: { threadId: 100, messageId: 200 },
    });
    expect(sendVideoDownloadedNotificationMock).toHaveBeenNthCalledWith(2, {
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 2 },
      messageId: 22,
      scenes: undefined,
      publishingDetails: undefined,
    });
  });
});
