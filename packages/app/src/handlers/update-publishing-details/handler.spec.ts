import { describe, expect, it } from 'vitest';

import * as moduleUnderTest from './handler';

describe('packages/app/src/handlers/update-publishing-details/handler.ts', () => {
  it('loads the module', () => {
    expect(moduleUnderTest).toBeTypeOf('object');
  });
});
