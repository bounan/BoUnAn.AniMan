import { beforeEach, describe, expect, it, vi } from 'vitest';

const initConfigMock = vi.hoisted(() => vi.fn());
const retryMock = vi.hoisted(() => vi.fn(async (operation: () => Promise<unknown>) => operation()));
const savePublishingDetailsMock = vi.hoisted(() => vi.fn());

vi.mock('../../config/config', () => ({
  initConfig: initConfigMock,
}));

vi.mock('../../../../../third-party/common/ts/runtime/retry', () => ({
  retry: retryMock,
}));

vi.mock('./repository', () => ({
  savePublishingDetails: savePublishingDetailsMock,
}));

describe('packages/app/src/handlers/update-publishing-details/handler.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    initConfigMock.mockReset().mockResolvedValue(undefined);
    retryMock.mockReset().mockImplementation(async (operation: () => Promise<unknown>) => operation());
    savePublishingDetailsMock.mockReset().mockResolvedValue(undefined);
  });

  it('saves publishing details for every input item', async () => {
    const request = {
      items: [
        {
          videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 2 },
          publishingDetails: { threadId: 100, messageId: 200 },
        },
        {
          videoKey: { myAnimeListId: 3, dub: 'Sub', episode: 4 },
          publishingDetails: { threadId: 101, messageId: 201 },
        },
      ],
    };

    const module = await import('./handler');
    await module.handler(request, null as never, null as never);

    expect(initConfigMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(retryMock).toHaveBeenCalledWith(expect.any(Function), 3);
    expect(savePublishingDetailsMock).toHaveBeenCalledTimes(2);
    expect(savePublishingDetailsMock).toHaveBeenNthCalledWith(
      1,
      { myAnimeListId: 1, dub: 'Dub', episode: 2 },
      { threadId: 100, messageId: 200 },
    );
    expect(savePublishingDetailsMock).toHaveBeenNthCalledWith(
      2,
      { myAnimeListId: 3, dub: 'Sub', episode: 4 },
      { threadId: 101, messageId: 201 },
    );
  });
});
