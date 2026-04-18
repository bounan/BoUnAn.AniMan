import { describe, expect } from 'vitest';

import { handler } from '../../../app/src/handlers/get-video-to-download/handler';
import { it } from '../../fixtures';
import { performCommonChecks } from '../../tools/custom-expectations';

describe('get-video-to-download', () => {
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
});
