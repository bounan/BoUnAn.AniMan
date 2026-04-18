import { describe, expect, it } from 'vitest';

import { handler } from './get-video-to-download';

describe('packages/app/src/handlers-mocks/get-video-to-download.ts', () => {
  it('throws not implemented', async () => {
    await expect(handler(undefined, null as never, null as never)).rejects.toThrow('Not implemented');
  });
});
