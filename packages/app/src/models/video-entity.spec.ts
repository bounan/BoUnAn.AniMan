import { describe, expectTypeOf, it } from 'vitest';

import type { VideoEntity } from './video-entity';

describe('packages/app/src/models/video-entity.ts', () => {
  it('exports the video entity type', () => {
    expectTypeOf<VideoEntity>().toMatchTypeOf<{
      primaryKey: string;
      myAnimeListId: number;
      dub: string;
      episode: number;
    }>();
  });
});
