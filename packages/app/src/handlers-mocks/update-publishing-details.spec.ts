import { describe, expect, it } from 'vitest';

import { handler } from './update-publishing-details';

describe('packages/app/src/handlers-mocks/update-publishing-details.ts', () => {
  it('throws not implemented', async () => {
    await expect(handler({ items: [] }, null as never, null as never)).rejects.toThrow('Not implemented');
  });
});
