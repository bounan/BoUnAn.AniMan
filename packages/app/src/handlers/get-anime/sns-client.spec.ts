import { beforeEach, describe, expect, it, vi } from 'vitest';

const publishJsonMessageMock = vi.hoisted(() => vi.fn());

vi.mock('../../shared/sns-publisher', () => ({
  publishJsonMessage: publishJsonMessageMock,
}));

describe('sendVideoRegisteredNotification', () => {
  beforeEach(() => {
    vi.resetModules();
    publishJsonMessageMock.mockReset();
  });

  it('publishes video registered notifications', async () => {
    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        topics: {
          videoRegisteredTopicArn: 'arn:registered',
        },
      }),
    });

    const module = await import('./sns-client');
    const payload = [{ myAnimeListId: 1, dub: 'Dub', episode: 1 }];

    await module.sendVideoRegisteredNotification(payload);

    expect(publishJsonMessageMock).toHaveBeenCalledTimes(1);
    expect(publishJsonMessageMock).toHaveBeenCalledWith('arn:registered', {
      items: [{ videoKey: payload[0] }],
    });
  });
});
