import { afterEach, describe, expect, vi } from 'vitest';

import { it } from '../../fixtures';

afterEach(() => {
  vi.doUnmock('../../../app/src/handlers/get-anime/repository');
  vi.doUnmock('../../../app/src/handlers/get-video-to-download/repository');
  vi.doUnmock('../../../app/src/handlers/get-series-to-match/repository');
  vi.doUnmock('../../../app/src/handlers/register-videos/repository');
  vi.doUnmock('../../../app/src/handlers/register-videos/sns-client');
  vi.doUnmock('../../../app/src/handlers/update-publishing-details/repository');
  vi.doUnmock('../../../app/src/handlers/update-video-scenes/repository');
  vi.doUnmock('../../../app/src/handlers/update-video-scenes/sns-client');
  vi.doUnmock('../../../app/src/handlers/update-video-status/repository');
  vi.doUnmock('../../../app/src/handlers/update-video-status/sns-client');
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('handler retry paths', () => {
  it('retries get-anime when repository access fails transiently', async () => {
    const getAnimeForUser = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce({
        status: 3,
        messageId: 42,
        scenes: undefined,
        publishingDetails: undefined,
      });

    vi.doMock('../../../app/src/handlers/get-anime/repository', () => ({
      getAnimeForUser,
      getRegisteredEpisodes: vi.fn(),
    }));

    const { handler } = await import('../../../app/src/handlers/get-anime/handler');
    const response = await handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
    }, null as never, null as never);

    expect(response).toEqual({
      status: 'Downloaded',
      messageId: 42,
      scenes: undefined,
      publishingDetails: undefined,
    });
    expect(getAnimeForUser).toHaveBeenCalledTimes(2);
  });

  it('retries get-video-to-download when selection fails once', async () => {
    const getEpisodeToDownloadAndLock = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce({ myAnimeListId: 1, dub: 'Dub', episode: 1 });

    vi.doMock('../../../app/src/handlers/get-video-to-download/repository', () => ({
      getEpisodeToDownloadAndLock,
    }));

    const { handler } = await import('../../../app/src/handlers/get-video-to-download/handler');
    const response = await handler(undefined, null as never, null as never);

    expect(response).toEqual({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
    });
    expect(getEpisodeToDownloadAndLock).toHaveBeenCalledTimes(2);
  });

  it('retries get-series-to-match when selection fails once', async () => {
    const getEpisodesToMatch = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce([{ myAnimeListId: 1, dub: 'Dub', episode: 1 }]);

    vi.doMock('../../../app/src/handlers/get-series-to-match/repository', () => ({
      getEpisodesToMatch,
    }));

    const { handler } = await import('../../../app/src/handlers/get-series-to-match/handler');
    const response = await handler(undefined, null as never, null as never);

    expect(response).toEqual({
      videosToMatch: [{ myAnimeListId: 1, dub: 'Dub', episode: 1 }],
    });
    expect(getEpisodesToMatch).toHaveBeenCalledTimes(2);
  });

  it('retries register-videos when the lookup fails once', async () => {
    const getExistingVideos = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce([]);
    const sendVideoRegisteredNotification = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../../app/src/handlers/register-videos/repository', () => ({
      getExistingVideos,
    }));
    vi.doMock('../../../app/src/handlers/register-videos/sns-client', () => ({
      sendVideoRegisteredNotification,
    }));

    const { handler } = await import('../../../app/src/handlers/register-videos/handler');
    await handler({
      items: [{ videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 } }],
    }, null as never, null as never);

    expect(getExistingVideos).toHaveBeenCalledTimes(2);
    expect(sendVideoRegisteredNotification).toHaveBeenCalledTimes(1);
  });

  it('retries update-publishing-details when a write fails once', async () => {
    const savePublishingDetails = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue(undefined);

    vi.doMock('../../../app/src/handlers/update-publishing-details/repository', () => ({
      savePublishingDetails,
    }));

    const { handler } = await import('../../../app/src/handlers/update-publishing-details/handler');
    await handler({
      items: [
        {
          videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
          publishingDetails: { threadId: 10, messageId: 20 },
        },
      ],
    }, null as never, null as never);

    expect(savePublishingDetails).toHaveBeenCalledTimes(2);
  });

  it('retries update-video-scenes when scene persistence fails once', async () => {
    const updateVideoScenes = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValue(undefined);
    const sendSceneRecognizedNotification = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../../app/src/handlers/update-video-scenes/repository', () => ({
      updateVideoScenes,
    }));
    vi.doMock('../../../app/src/handlers/update-video-scenes/sns-client', () => ({
      sendSceneRecognizedNotification,
    }));

    const { handler } = await import('../../../app/src/handlers/update-video-scenes/handler');
    const items = [{ videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 }, scenes: { opening: { start: 1, end: 2 } } }];
    await handler({ items }, null as never, null as never);

    expect(updateVideoScenes).toHaveBeenCalledTimes(2);
    expect(sendSceneRecognizedNotification).toHaveBeenCalledTimes(1);
  });

  it('retries update-video-status when the status update fails once', async () => {
    const markVideoDownloaded = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce({
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 1,
        status: 3,
      });
    const sendVideoDownloadedNotification = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../../app/src/handlers/update-video-status/repository', () => ({
      markVideoDownloaded,
      markVideoFailed: vi.fn(),
    }));
    vi.doMock('../../../app/src/handlers/update-video-status/sns-client', () => ({
      sendVideoDownloadedNotification,
    }));

    const { handler } = await import('../../../app/src/handlers/update-video-status/handler');
    await handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
      messageId: 123,
    }, null as never, null as never);

    expect(markVideoDownloaded).toHaveBeenCalledTimes(2);
    expect(sendVideoDownloadedNotification).toHaveBeenCalledTimes(1);
  });
});
