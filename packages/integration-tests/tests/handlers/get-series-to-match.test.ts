import { describe, expect } from 'vitest';

import { handler } from '../../../app/src/handlers/get-series-to-match/handler';
import { it } from '../../fixtures';
import { performCommonChecks } from '../../tools/custom-expectations';

describe('get-series-to-match', () => {
  it('REQ-GSTM-01: returns empty when no pending group exists', async () => {
    const response = await handler(undefined, null as never, null as never) as {
      videosToMatch: { myAnimeListId: number; dub: string; episode: number }[];
    };
    expect(response).toEqual({ videosToMatch: [] });
  });

  it('REQ-GSTM-03: returns a group and marks it as processing', async ({ table }) => {
    await table.putRecords(
      {
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
      },
      {
        primaryKey: '1#Dub#2',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 2,
        status: 1,
        matchingStatus: 1,
        sortKey: '1#2025-01-01T00:00:00.000Z#0002',
        matchingGroup: '1#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
      {
        primaryKey: '2#Dub#1',
        animeKey: '2#Dub',
        myAnimeListId: 2,
        dub: 'Dub',
        episode: 1,
        status: 1,
        matchingStatus: 1,
        sortKey: '1#2025-01-01T00:00:00.000Z#0001',
        matchingGroup: '2#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    );

    const response = await handler(undefined, null as never, null as never) as {
      videosToMatch: { myAnimeListId: number; dub: string; episode: number }[];
    };

    expect(response.videosToMatch).toHaveLength(2);
    expect(response.videosToMatch).toEqual(expect.arrayContaining([
      { myAnimeListId: 1, dub: 'Dub', episode: 1 },
      { myAnimeListId: 1, dub: 'Dub', episode: 2 },
    ]));

    const rows = await table.getAllRecords();
    expect(rows.filter(x => x.matchingGroup === '1#Dub').every(x => x.matchingStatus === 2)).toBe(true);
    expect(rows.find(x => x.primaryKey === '2#Dub#1')?.matchingStatus).toBe(1);
    await performCommonChecks(table);
  });

  it('REQ-GSTM-04: returns retryable failed matcher groups and marks them as processing', async ({ table }) => {
    await table.putRecords(
      {
        primaryKey: '1#Dub#3',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 3,
        status: 3,
        matchingStatus: 5,
        sortKey: '1#2025-01-01T00:00:00.000Z#0003',
        matchingGroup: '1#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        matchingPerformedAttempts: 2,
      },
      {
        primaryKey: '1#Dub#4',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 4,
        status: 3,
        matchingStatus: 5,
        sortKey: '1#2025-01-01T00:00:00.000Z#0004',
        matchingGroup: '1#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        matchingPerformedAttempts: 3,
      },
    );

    const response = await handler(undefined, null as never, null as never) as {
      videosToMatch: { myAnimeListId: number; dub: string; episode: number }[];
    };

    expect(response.videosToMatch).toHaveLength(2);
    expect(response.videosToMatch).toEqual(expect.arrayContaining([
      { myAnimeListId: 1, dub: 'Dub', episode: 3 },
      { myAnimeListId: 1, dub: 'Dub', episode: 4 },
    ]));

    const rows = await table.getAllRecords();
    expect(rows.every(x => x.matchingStatus === 2)).toBe(true);
    expect(rows.map(x => x.matchingPerformedAttempts)).toEqual([2, 3]);
    await performCommonChecks(table);
  });

  it('REQ-GSTM-05: skips failed matcher groups that reached attempt limit or are still cooling down', async ({ table }) => {
    const recentIso = new Date().toISOString();

    await table.putRecords(
      {
        primaryKey: '1#Dub#5',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 5,
        status: 3,
        matchingStatus: 5,
        sortKey: '1#2025-01-01T00:00:00.000Z#0005',
        matchingGroup: '1#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        matchingPerformedAttempts: 5,
      },
      {
        primaryKey: '1#Dub#6',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 6,
        status: 3,
        matchingStatus: 5,
        sortKey: '1#2025-01-01T00:00:00.000Z#0006',
        matchingGroup: '1#Dub',
        createdAt: recentIso,
        updatedAt: recentIso,
        matchingPerformedAttempts: 2,
      },
    );

    const response = await handler(undefined, null as never, null as never) as {
      videosToMatch: { myAnimeListId: number; dub: string; episode: number }[];
    };

    expect(response).toEqual({ videosToMatch: [] });

    const rows = await table.getAllRecords();
    expect(rows.map(x => x.matchingStatus)).toEqual([5, 5]);
    await performCommonChecks(table);
  });
});
