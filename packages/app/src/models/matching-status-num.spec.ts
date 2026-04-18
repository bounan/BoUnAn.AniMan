import { describe, expect, it } from 'vitest';

import { MatchingStatusNum } from './matching-status-num';

describe('packages/app/src/models/matching-status-num.ts', () => {
  it('exposes stable numeric values', () => {
    expect(MatchingStatusNum.Unknown).toBe(0);
    expect(MatchingStatusNum.Pending).toBe(1);
    expect(MatchingStatusNum.Processing).toBe(2);
    expect(MatchingStatusNum.ProcessedWithResults).toBe(3);
    expect(MatchingStatusNum.ProcessedWithNoResults).toBe(4);
    expect(MatchingStatusNum.Failed).toBe(5);
    expect(MatchingStatusNum.NotAvailable).toBe(6);
  });
});
