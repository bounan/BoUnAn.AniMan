import { describe, expect, it } from 'vitest';

import { VideoStatusNum } from '../../models/video-status-num';
import { videoStatusToStr } from './video-status-to-str';

describe('packages/app/src/shared/helpers/video-status-to-str.ts', () => {
  it('maps all supported statuses', () => {
    expect(videoStatusToStr(VideoStatusNum.Pending)).toBe('Pending');
    expect(videoStatusToStr(VideoStatusNum.Downloading)).toBe('Downloading');
    expect(videoStatusToStr(VideoStatusNum.Downloaded)).toBe('Downloaded');
    expect(videoStatusToStr(VideoStatusNum.Failed)).toBe('Failed');
    expect(videoStatusToStr(VideoStatusNum.NotAvailable)).toBe('NotAvailable');
  });

  it('throws for unknown status', () => {
    expect(() => videoStatusToStr(VideoStatusNum.Unknown)).toThrow('Unknown status: 0');
  });
});
