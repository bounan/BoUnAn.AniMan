import { beforeEach, describe, expect, it, vi } from 'vitest';

const publishJsonMessageMock = vi.hoisted(() => vi.fn());

vi.mock('../../shared/sns-publisher', () => ({
  publishJsonMessage: publishJsonMessageMock,
}));

describe('sendVideoDownloadedNotification', () => {
  beforeEach(() => {
    vi.resetModules();
    publishJsonMessageMock.mockReset();
  });

  it('publishes the video-downloaded notification', async () => {
    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        topics: {
          videoDownloadedTopicArn: 'arn:downloaded',
        },
      }),
    });

    const module = await import('./sns-client');
    const notification = {
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
      messageId: 10,
      scenes: {},
      publishingDetails: { threadId: 5, messageId: 6 },
    };

    await module.sendVideoDownloadedNotification(notification);

    expect(publishJsonMessageMock).toHaveBeenCalledTimes(1);
    expect(publishJsonMessageMock).toHaveBeenCalledWith('arn:downloaded', notification);
  });
});
