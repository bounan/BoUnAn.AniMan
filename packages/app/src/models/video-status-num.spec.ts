import { describe, expect, it } from 'vitest';

import { VideoStatusNum } from './video-status-num';

describe('packages/app/src/models/video-status-num.ts', () => {
  it('exposes stable numeric values', () => {
    expect(VideoStatusNum.Unknown).toBe(0);
    expect(VideoStatusNum.Pending).toBe(1);
    expect(VideoStatusNum.Downloading).toBe(2);
    expect(VideoStatusNum.Downloaded).toBe(3);
    expect(VideoStatusNum.Failed).toBe(4);
    expect(VideoStatusNum.NotAvailable).toBe(5);
  });
});
