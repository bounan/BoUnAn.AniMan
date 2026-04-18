import { describe, expect, it } from 'vitest';

import * as moduleUnderTest from './handler';

describe('packages/app/src/handlers/register-videos/handler.ts', () => {
  it('loads the module', () => {
    expect(moduleUnderTest).toBeTypeOf('object');
  });
});
