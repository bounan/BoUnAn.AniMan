import { describe, expect, it } from 'vitest';

import { handler } from './update-video-status';

describe('packages/app/src/handlers-mocks/update-video-status.ts', () => {
  it('throws not implemented', async () => {
    await expect(handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
    }, null as never, null as never)).rejects.toThrow('Not implemented');
  });
});
