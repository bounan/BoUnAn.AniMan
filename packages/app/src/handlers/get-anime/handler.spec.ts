import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BotResponse } from '../../../../../third-party/common/ts/interfaces';

const initConfigMock = vi.hoisted(() => vi.fn());
const retryMock = vi.hoisted(() => vi.fn(async (operation: () => Promise<unknown>) => operation()));
const getEpisodesMock = vi.hoisted(() => vi.fn());
const increasePriorityMock = vi.hoisted(() => vi.fn());
const insertVideoMock = vi.hoisted(() => vi.fn());
const getAnimeForUserMock = vi.hoisted(() => vi.fn());
const getRegisteredEpisodesMock = vi.hoisted(() => vi.fn());
const sendVideoRegisteredNotificationMock = vi.hoisted(() => vi.fn());

vi.mock('../../config/config', () => ({
  initConfig: initConfigMock,
}));

vi.mock('../../../../../third-party/common/ts/runtime/retry', () => ({
  retry: retryMock,
}));

vi.mock('../../api-clients/loan-api-client', () => ({
  getEpisodes: getEpisodesMock,
}));

vi.mock('../../shared/repository', () => ({
  increasePriority: increasePriorityMock,
  insertVideo: insertVideoMock,
}));

vi.mock('./repository', () => ({
  getAnimeForUser: getAnimeForUserMock,
  getRegisteredEpisodes: getRegisteredEpisodesMock,
}));

vi.mock('./sns-client', () => ({
  sendVideoRegisteredNotification: sendVideoRegisteredNotificationMock,
}));

describe('packages/app/src/handlers/get-anime/handler.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    initConfigMock.mockReset().mockResolvedValue(undefined);
    retryMock.mockReset().mockImplementation(async (operation: () => Promise<unknown>) => operation());
    getEpisodesMock.mockReset();
    increasePriorityMock.mockReset().mockResolvedValue(undefined);
    insertVideoMock.mockReset().mockResolvedValue(undefined);
    getAnimeForUserMock.mockReset();
    getRegisteredEpisodesMock.mockReset();
    sendVideoRegisteredNotificationMock.mockReset().mockResolvedValue(undefined);
  });

  it('throws on invalid request', async () => {
    const module = await import('./handler');

    await expect(
      module.handler(
        {
          videoKey: {
            myAnimeListId: 0,
            dub: 'Dub',
            episode: 1,
          },
        },
        null as never,
        null as never))
      .rejects
      .toThrow('Invalid request');

    expect(initConfigMock).not.toHaveBeenCalled();
    expect(retryMock).not.toHaveBeenCalled();
  });

  it('returns downloaded video details as-is', async () => {
    const videoKey = { myAnimeListId: 1, dub: 'Dub', episode: 7 };
    getAnimeForUserMock.mockResolvedValue({
      status: 3,
      messageId: 42,
      scenes: { opening: { start: 1, end: 2 } },
      publishingDetails: { threadId: 10, messageId: 11 },
    });

    const module = await import('./handler');
    const result = await module.handler({ videoKey }, null as never, null as never);

    expect(result).toEqual({
      status: 'Downloaded',
      messageId: 42,
      scenes: { opening: { start: 1, end: 2 } },
      publishingDetails: { threadId: 10, messageId: 11 },
    });

    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(getAnimeForUserMock).toHaveBeenCalledWith(videoKey);
    expect(increasePriorityMock).not.toHaveBeenCalled();
    expect(insertVideoMock).not.toHaveBeenCalled();
    expect(sendVideoRegisteredNotificationMock).not.toHaveBeenCalled();
  });

  it('bumps priority and returns pending for already-known pending video', async () => {
    const videoKey = { myAnimeListId: 2, dub: 'Sub', episode: 4 };
    getAnimeForUserMock.mockResolvedValue({ status: 1 });

    const module = await import('./handler');
    const result = await module.handler({ videoKey }, null as never, null as never);

    expect(result).toEqual({
      status: 'Pending',
      messageId: undefined,
      scenes: undefined,
      publishingDetails: undefined,
    });
    expect(increasePriorityMock).toHaveBeenCalledTimes(1);
    expect(increasePriorityMock).toHaveBeenCalledWith(videoKey);
    expect(insertVideoMock).not.toHaveBeenCalled();
  });

  it('returns not available when no episodes exist in source', async () => {
    const videoKey = { myAnimeListId: 3, dub: 'Dub', episode: 5 };
    getAnimeForUserMock.mockResolvedValue(undefined);
    getEpisodesMock.mockResolvedValue([]);

    const module = await import('./handler');
    const result = await module.handler({ videoKey }, null as never, null as never);

    expect(result).toEqual({
      status: 'NotAvailable',
      messageId: undefined,
      scenes: undefined,
      publishingDetails: undefined,
    });

    expect(getEpisodesMock).toHaveBeenCalledWith(3, 'Dub');
    expect(getRegisteredEpisodesMock).not.toHaveBeenCalled();
    expect(insertVideoMock).not.toHaveBeenCalled();
    expect(increasePriorityMock).not.toHaveBeenCalled();
    expect(sendVideoRegisteredNotificationMock).not.toHaveBeenCalled();
  });

  it('registers only missing episodes, prioritizes request and sends notification', async () => {
    const videoKey = { myAnimeListId: 9, dub: 'Dub', episode: 2 };
    getAnimeForUserMock.mockResolvedValue(undefined);
    getEpisodesMock.mockResolvedValue([1, 2, 3]);
    getRegisteredEpisodesMock.mockResolvedValue([1]);

    const module = await import('./handler');
    const result = await module.handler({ videoKey }, null as never, null as never) as BotResponse;

    expect(result.status).toBe('Pending');
    expect(insertVideoMock).toHaveBeenCalledTimes(1);
    expect(insertVideoMock).toHaveBeenCalledWith([
      { myAnimeListId: 9, dub: 'Dub', episode: 2 },
      { myAnimeListId: 9, dub: 'Dub', episode: 3 },
    ]);
    expect(increasePriorityMock).toHaveBeenCalledWith(videoKey);
    expect(sendVideoRegisteredNotificationMock).toHaveBeenCalledWith([
      { myAnimeListId: 9, dub: 'Dub', episode: 2 },
      { myAnimeListId: 9, dub: 'Dub', episode: 3 },
    ]);
  });

  it('throws a range error for unsupported status', async () => {
    getAnimeForUserMock.mockResolvedValue({ status: 0 });
    const module = await import('./handler');

    await expect(
      module.handler({ videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 } }, null as never, null as never),
    ).rejects.toThrow(RangeError);
  });
});
