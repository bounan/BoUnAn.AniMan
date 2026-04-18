import { describe, expect } from 'vitest';

import { handler } from '../../../app/src/handlers/update-publishing-details/handler';
import { it } from '../../fixtures';
import { performCommonChecks } from '../../tools/custom-expectations';

describe('update-publishing-details', () => {
  it('REQ-UPD-02: saves publishing details for multiple videos', async ({ table }) => {
    await table.putRecords(
      {
        primaryKey: '1#Dub#1',
        animeKey: '1#Dub',
        myAnimeListId: 1,
        dub: 'Dub',
        episode: 1,
        status: 3,
        matchingStatus: 3,
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
        matchingStatus: 3,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    );

    await handler({
      items: [
        {
          videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
          publishingDetails: { threadId: 10, messageId: 20 },
        },
        {
          videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 2 },
          publishingDetails: { threadId: 11, messageId: 21 },
        },
      ],
    }, null as never, null as never);

    const rows = await table.getAllRecords();
    expect(rows.find(x => x.primaryKey === '1#Dub#1')?.publishingDetails).toEqual({ threadId: 10, messageId: 20 });
    expect(rows.find(x => x.primaryKey === '1#Dub#2')?.publishingDetails).toEqual({ threadId: 11, messageId: 21 });
    await performCommonChecks(table);
  });
});
