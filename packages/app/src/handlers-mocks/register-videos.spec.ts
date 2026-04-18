import { describe, expect, it } from 'vitest';

import { handler } from './register-videos';

describe('packages/app/src/handlers-mocks/register-videos.ts', () => {
  it('throws not implemented', async () => {
    await expect(handler({ items: [] }, null as never, null as never)).rejects.toThrow('Not implemented');
  });
});
