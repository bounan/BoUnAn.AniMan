import { describe, expect, it } from 'vitest';

import { handler } from './update-video-scenes';

describe('packages/app/src/handlers-mocks/update-video-scenes.ts', () => {
  it('throws not implemented', async () => {
    await expect(handler({ items: [] }, null as never, null as never)).rejects.toThrow('Not implemented');
  });
});
