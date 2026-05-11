import { beforeEach, describe, expect, it, vi } from 'vitest';

const initConfigMock = vi.hoisted(() => vi.fn());
const retryMock = vi.hoisted(() => vi.fn(async (operation: () => Promise<unknown>) => operation()));
const updateVideoScenesMock = vi.hoisted(() => vi.fn());
const sendSceneRecognizedNotificationMock = vi.hoisted(() => vi.fn());

vi.mock('../../config/config', () => ({
  initConfig: initConfigMock,
}));

vi.mock('../../../../../third-party/common/ts/runtime/retry', () => ({
  retry: retryMock,
}));

vi.mock('./repository', () => ({
  updateVideoScenes: updateVideoScenesMock,
}));

vi.mock('./sns-client', () => ({
  sendSceneRecognizedNotification: sendSceneRecognizedNotificationMock,
}));

describe('packages/app/src/handlers/update-video-scenes/handler.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    initConfigMock.mockReset().mockResolvedValue(undefined);
    retryMock.mockReset().mockImplementation(async (operation: () => Promise<unknown>) => operation());
    updateVideoScenesMock.mockReset().mockResolvedValue(undefined);
    sendSceneRecognizedNotificationMock.mockReset().mockResolvedValue(undefined);
  });

  it('updates scenes and then sends scene-recognized notifications', async () => {
    const request = {
      items: [{
        videoKey: { myAnimeListId: 7, dub: 'Dub', episode: 8 },
        scenes: { opening: { start: 1, end: 2 } },
      }],
    };

    const module = await import('./handler');
    await module.handler(request, null as never, null as never);

    expect(initConfigMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledWith(expect.any(Function), 3);
    expect(updateVideoScenesMock).toHaveBeenCalledTimes(1);
    expect(updateVideoScenesMock).toHaveBeenCalledWith(request);
    expect(sendSceneRecognizedNotificationMock).toHaveBeenCalledTimes(1);
    expect(sendSceneRecognizedNotificationMock).toHaveBeenCalledWith(request.items);
  });
});
