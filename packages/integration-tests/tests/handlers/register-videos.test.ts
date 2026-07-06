import { describe, expect } from 'vitest';

import { handler } from '../../../app/src/handlers/register-videos/handler';
import { it } from '../../fixtures';
import { expectNoDbChanges, performCommonChecks } from '../../tools/custom-expectations';

describe('register-videos', () => {
  it('REQ-RV-01: rejects invalid requests', async ({ table }) => {
    const initialState = await table.getAllRecords();

    await expect(handler({
      items: [{ videoKey: { myAnimeListId: 0, dub: 'Dub', episode: 1 } }],
    }, null as never, null as never)).rejects.toThrow('Invalid request');

    await expectNoDbChanges(initialState, table);
  });

  it('REQ-RV-02: does nothing when all videos already exist', async ({ table, aws, config }) => {
    const published = aws.captureSns(config.topics.videoRegisteredTopicArn);
    await table.putRecords({
      primaryKey: '1#Dub#1',
      animeKey: '1#Dub',
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 1,
      status: 1,
      matchingStatus: 1,
      sortKey: '1#2025-01-01T00:00:00.000Z#0001',
      matchingGroup: '1#Dub',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    const initialState = await table.getAllRecords();

    await handler({
      items: [{ videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 } }],
    }, null as never, null as never);

    expect(published.messages).toHaveLength(0);
    await expectNoDbChanges(initialState, table);
  });

  it('REQ-RV-03: inserts only missing videos and emits notification', async ({ table, aws, config }) => {
    const published = aws.captureSns(config.topics.videoRegisteredTopicArn);
    await table.putRecords({
      primaryKey: '1#Dub#1',
      animeKey: '1#Dub',
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 1,
      status: 1,
      matchingStatus: 1,
      sortKey: '1#2025-01-01T00:00:00.000Z#0001',
      matchingGroup: '1#Dub',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    await handler({
      items: [
        { videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 } },
        { videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 2 } },
      ],
    }, null as never, null as never);

    const rows = await table.getAllRecords();
    expect(rows.map(x => x.primaryKey)).toEqual(['1#Dub#1', '1#Dub#2']);
    expect(rows.find(x => x.primaryKey === '1#Dub#2')?.matchingGroup).toBe('1#Dub');
    expect(published.messages).toHaveLength(1);
    await performCommonChecks(table);
  });

  it('REQ-RV-04: does not assign matching group to episode 0 or 1', async ({ table }) => {
    await handler({
      items: [
        { videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 0 } },
        { videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 } },
      ],
    }, null as never, null as never);

    const rows = await table.getAllRecords();
    expect(rows.find(x => x.primaryKey === '1#Dub#0')?.matchingGroup).toBeUndefined();
    expect(rows.find(x => x.primaryKey === '1#Dub#1')?.matchingGroup).toBeUndefined();
  });
});
