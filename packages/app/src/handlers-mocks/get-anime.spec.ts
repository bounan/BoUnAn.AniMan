import { describe, expect, it } from 'vitest';

import { handler } from './get-anime';

describe('packages/app/src/handlers-mocks/get-anime.ts', () => {
  it('returns pending for episode 1', async () => {
    await expect(handler({
      videoKey: { myAnimeListId: 10, dub: 'Dub', episode: 1 },
    }, null as never, null as never)).resolves.toEqual({
      status: 'Pending',
      messageId: undefined,
      scenes: undefined,
      publishingDetails: undefined,
    });
  });

  it('returns downloading for episode 2', async () => {
    await expect(handler({
      videoKey: { myAnimeListId: 10, dub: 'Dub', episode: 2 },
    }, null as never, null as never)).resolves.toEqual({
      status: 'Downloading',
      messageId: undefined,
      scenes: undefined,
      publishingDetails: undefined,
    });
  });

  it('returns downloaded payload for other episodes', async () => {
    await expect(handler({
      videoKey: { myAnimeListId: 10, dub: 'Dub', episode: 3 },
    }, null as never, null as never)).resolves.toEqual({
      status: 'Downloaded',
      messageId: 4008,
      scenes: {
        opening: {
          start: 70,
          end: 158,
        },
        ending: {
          start: 1281,
          end: 1372.55,
        },
      },
      publishingDetails: {
        threadId: 6377,
        messageId: 6396,
      },
    });
  });

  it('rejects invalid requests', async () => {
    await expect(handler({
      videoKey: { myAnimeListId: 0, dub: 'Dub', episode: 1 },
    }, null as never, null as never)).rejects.toThrow('Invalid request');
  });
});
