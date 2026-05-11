import { describe, expect } from 'vitest';

import { handler } from '../../../app/src/handlers/update-video-scenes/handler';
import { it } from '../../fixtures';
import { performCommonChecks } from '../../tools/custom-expectations';

describe('update-video-scenes', () => {
  it('REQ-UVSC-01/02/03/04: processes mixed matcher results and emits notification', async ({ table, aws, config }) => {
    const published = aws.captureSns(config.topics.sceneRecognisedTopicArn);
    await table.putRecords(
      {
        primaryKey: '1#Dub#1',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 1,
        status: 3,
        matchingStatus: 2,
        matchingGroup: '1#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
      {
        primaryKey: '1#Dub#2',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 2,
        status: 3,
        matchingStatus: 2,
        matchingGroup: '1#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
      {
        primaryKey: '1#Dub#3',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 3,
        status: 3,
        matchingStatus: 2,
        matchingGroup: '1#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        matchingPerformedAttempts: 2,
      },
    );

    const items = [
      {
        videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
        scenes: { opening: { start: 1, end: 2 } },
      },
      {
        videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 2 },
        scenes: {},
      },
      {
        videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 3 },
      },
    ];

    await handler({ items }, null as never, null as never);

    const rows = await table.getAllRecords();
    expect(rows.find(x => x.primaryKey === '1#Dub#1')).toMatchObject({
      matchingStatus: 3,
      scenes: { opening: { start: 1, end: 2 } },
    });
    expect(rows.find(x => x.primaryKey === '1#Dub#1')?.matchingGroup).toBeUndefined();
    expect(rows.find(x => x.primaryKey === '1#Dub#2')?.matchingStatus).toBe(4);
    expect(rows.find(x => x.primaryKey === '1#Dub#2')?.matchingGroup).toBeUndefined();
    expect(rows.find(x => x.primaryKey === '1#Dub#3')?.matchingStatus).toBe(5);
    expect(rows.find(x => x.primaryKey === '1#Dub#3')?.matchingGroup).toBe('1#Dub');
    expect((rows.find(x => x.primaryKey === '1#Dub#3') as Record<string, unknown> | undefined)?.matchingPerformedAttempts).toBe(3);
    expect(published.messages).toHaveLength(1);
    await performCommonChecks(table);
  });
});
