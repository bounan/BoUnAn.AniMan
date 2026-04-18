import { describe, expect, it } from 'vitest';

import { handler } from './get-series-to-match';

describe('packages/app/src/handlers-mocks/get-series-to-match.ts', () => {
  it('throws not implemented', async () => {
    await expect(handler(undefined, null as never, null as never)).rejects.toThrow('Not implemented');
  });
});
