import { beforeEach, describe, expect, it, vi } from 'vitest';

const initConfigMock = vi.hoisted(() => vi.fn());
const retryMock = vi.hoisted(() => vi.fn(async (operation: () => Promise<unknown>) => operation()));
const markVideoDownloadedMock = vi.hoisted(() => vi.fn());
const markVideoFailedMock = vi.hoisted(() => vi.fn());
const sendVideoDownloadedNotificationMock = vi.hoisted(() => vi.fn());

vi.mock('../../config/config', () => ({
  initConfig: initConfigMock,
}));

vi.mock('../../../../../third-party/common/ts/runtime/retry', () => ({
  retry: retryMock,
}));

vi.mock('./repository', () => ({
  markVideoDownloaded: markVideoDownloadedMock,
  markVideoFailed: markVideoFailedMock,
}));

vi.mock('./sns-client', () => ({
  sendVideoDownloadedNotification: sendVideoDownloadedNotificationMock,
}));

describe('packages/app/src/handlers/update-video-status/handler.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    initConfigMock.mockReset().mockResolvedValue(undefined);
    retryMock.mockReset().mockImplementation(async (operation: () => Promise<unknown>) => operation());
    markVideoDownloadedMock.mockReset();
    markVideoFailedMock.mockReset();
    sendVideoDownloadedNotificationMock.mockReset().mockResolvedValue(undefined);
  });

  it('marks downloaded videos and publishes enriched notification', async () => {
    const request = {
      videoKey: { myAnimeListId: 12, dub: 'Dub', episode: 6 },
      messageId: 345,
    };
    markVideoDownloadedMock.mockResolvedValue({
      scenes: { opening: { start: 1, end: 2 } },
      publishingDetails: { threadId: 22, messageId: 33 },
    });

    const module = await import('./handler');
    await module.handler(request, null as never, null as never);

    expect(initConfigMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(markVideoDownloadedMock).toHaveBeenCalledTimes(1);
    expect(markVideoDownloadedMock).toHaveBeenCalledWith({ myAnimeListId: 12, dub: 'Dub', episode: 6 }, 345);
    expect(markVideoFailedMock).not.toHaveBeenCalled();
    expect(sendVideoDownloadedNotificationMock).toHaveBeenCalledWith({
      videoKey: { myAnimeListId: 12, dub: 'Dub', episode: 6 },
      messageId: 345,
      scenes: { opening: { start: 1, end: 2 } },
      publishingDetails: { threadId: 22, messageId: 33 },
    });
  });

  it('marks failed videos and still publishes a notification', async () => {
    const request = {
      videoKey: { myAnimeListId: 14, dub: 'Sub', episode: 9 },
      messageId: undefined,
    };
    markVideoFailedMock.mockResolvedValue({
      scenes: undefined,
      publishingDetails: undefined,
    });

    const module = await import('./handler');
    await module.handler(request, null as never, null as never);

    expect(markVideoDownloadedMock).not.toHaveBeenCalled();
    expect(markVideoFailedMock).toHaveBeenCalledTimes(1);
    expect(markVideoFailedMock).toHaveBeenCalledWith({ myAnimeListId: 14, dub: 'Sub', episode: 9 });
    expect(sendVideoDownloadedNotificationMock).toHaveBeenCalledWith({
      videoKey: { myAnimeListId: 14, dub: 'Sub', episode: 9 },
      messageId: undefined,
      scenes: undefined,
      publishingDetails: undefined,
    });
  });
});
