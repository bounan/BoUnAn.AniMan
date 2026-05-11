import { beforeEach, describe, expect, it, vi } from 'vitest';

const publishJsonMessageMock = vi.hoisted(() => vi.fn());

vi.mock('../../shared/sns-publisher', () => ({
  publishJsonMessage: publishJsonMessageMock,
}));

describe('sendSceneRecognizedNotification', () => {
  beforeEach(() => {
    vi.resetModules();
    publishJsonMessageMock.mockReset();
  });

  it('publishes scene-recognized notifications', async () => {
    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        topics: {
          sceneRecognisedTopicArn: 'arn:scene',
        },
      }),
    });

    const module = await import('./sns-client');
    const items = [{
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
      scenes: { opening: { start: 1, end: 2 } },
    }];

    await module.sendSceneRecognizedNotification(items);

    expect(publishJsonMessageMock).toHaveBeenCalledTimes(1);
    expect(publishJsonMessageMock).toHaveBeenCalledWith('arn:scene', { items });
  });
});
