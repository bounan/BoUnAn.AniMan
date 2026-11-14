import { describe, expect } from 'vitest';

import { handler } from '../../../app/src/handlers/get-video-to-download/handler';
import { it } from '../../fixtures';
import { performCommonChecks } from '../../tools/custom-expectations';

describe('get-video-to-download', () => {
  it('redrives stale in-progress work but skips work still cooling down', async ({ table }) => {
    const recentIso = new Date().toISOString();
    await table.putRecords(
      {
        primaryKey: '1#Dub#7',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 7,
        status: 2,
        matchingStatus: 1,
        sortKey: '1#2025-01-01T00:00:00.000Z#0007',
        matchingGroup: '1#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        downloadPerformedAttempts: 2,
      },
      {
        primaryKey: '2#Dub#8',
        animeKey: '2#Dub',
        myAnimeListId: 2,
        dub: 'Dub',
        episode: 8,
        status: 2,
        matchingStatus: 1,
        sortKey: '1#2099-01-01T00:00:00.000Z#0008',
        matchingGroup: '2#Dub',
        createdAt: recentIso,
        updatedAt: recentIso,
        downloadPerformedAttempts: 2,
      },
    );
    const response = await handler(undefined, null as never, null as never);
    expect(response).toEqual({ videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 7 } });
    const rows = await table.getAllRecords();
    expect(rows.find((row) => row.primaryKey === '2#Dub#8')?.updatedAt).toBe(recentIso);
  });

  it('REQ-GVTD-01: returns empty response when no candidate exists', async () => {
    const response = await handler(undefined, null as never, null as never);
    expect(response).toEqual({ videoKey: undefined });
  });

  it('REQ-GVTD-02: returns and locks the first pending video', async ({ table }) => {
    await table.putRecords({
      primaryKey: '1#Dub#1',
      animeKey: '1#Dub',
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 1,
      status: 1,
      matchingStatus: 1,
      sortKey: '0#2025-01-01T00:00:00.000Z#0001',
      matchingGroup: '1#Dub',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    const response = await handler(undefined, null as never, null as never);

    expect(response).toEqual({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
    });

    const row = (await table.getAllRecords())[0];
    expect(row.status).toBe(2);
    await performCommonChecks(table);
  });

  it('REQ-GVTD-03: returns and locks a failed video when retry window elapsed and attempts stay below limit', async ({
    table,
  }) => {
    await table.putRecords({
      primaryKey: '1#Dub#3',
      animeKey: '1#Dub',
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 3,
      status: 4,
      matchingStatus: 1,
      sortKey: '0#2025-01-01T00:00:00.000Z#0003',
      matchingGroup: '1#Dub',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      downloadPerformedAttempts: 2,
    });

    const response = await handler(undefined, null as never, null as never);

    expect(response).toEqual({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 3 },
    });

    const row = (await table.getAllRecords())[0];
    expect(row.status).toBe(2);
    expect(row.downloadPerformedAttempts).toBe(2);
    await performCommonChecks(table);
  });

  it('REQ-GVTD-04: skips failed videos that reached attempt limit or are still cooling down', async ({ table }) => {
    const recentIso = new Date().toISOString();

    await table.putRecords(
      {
        primaryKey: '1#Dub#4',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 4,
        status: 4,
        matchingStatus: 1,
        sortKey: '0#2025-01-01T00:00:00.000Z#0004',
        matchingGroup: '1#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        downloadPerformedAttempts: 5,
      },
      {
        primaryKey: '1#Dub#5',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 5,
        status: 4,
        matchingStatus: 1,
        sortKey: '0#2099-01-01T00:00:00.000Z#0005',
        matchingGroup: '1#Dub',
        createdAt: recentIso,
        updatedAt: recentIso,
        downloadPerformedAttempts: 2,
      },
    );

    const response = await handler(undefined, null as never, null as never);

    expect(response).toEqual({ videoKey: undefined });

    const rows = await table.getAllRecords();
    expect(rows.map((row) => row.status)).toEqual([4, 4]);
    await performCommonChecks(table);
  });
});
