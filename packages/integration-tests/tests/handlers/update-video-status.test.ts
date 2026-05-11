import { describe, expect } from 'vitest';

import { handler } from '../../../app/src/handlers/update-video-status/handler';
import { it } from '../../fixtures';
import { performCommonChecks } from '../../tools/custom-expectations';

describe('update-video-status', () => {
  it('REQ-UVS-01: marks video as downloaded and emits notification', async ({ table, aws, config }) => {
    const published = aws.captureSns(config.topics.videoDownloadedTopicArn);
    await table.putRecords({
      primaryKey: '1#Dub#1',
      animeKey: '1#Dub',
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 1,
      status: 2,
      matchingStatus: 3,
      sortKey: '0#2025-01-01T00:00:00.000Z#0001',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      scenes: { opening: { start: 1, end: 2 } },
      publishingDetails: { threadId: 7, messageId: 8 },
    });

    await handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
      messageId: 123,
    }, null as never, null as never);

    const row = (await table.getAllRecords())[0];
    expect(row.status).toBe(3);
    expect(row.messageId).toBe(123);
    expect(row.sortKey).toBeUndefined();
    expect(published.messages).toHaveLength(1);
    await performCommonChecks(table);
  });

  it('REQ-UVS-02: marks video as failed and emits notification', async ({ table, aws, config }) => {
    const published = aws.captureSns(config.topics.videoDownloadedTopicArn);
    await table.putRecords({
      primaryKey: '1#Dub#2',
      animeKey: '1#Dub',
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 2,
      status: 2,
      matchingStatus: 1,
      sortKey: '0#2025-01-01T00:00:00.000Z#0002',
      matchingGroup: '1#Dub',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      downloadPerformedAttempts: 2,
    });

    await handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 2 },
    }, null as never, null as never);

    const row = (await table.getAllRecords())[0];
    expect(row.status).toBe(4);
    expect(row.messageId).toBeNull();
    expect(row.downloadPerformedAttempts).toBe(3);
    expect(published.messages).toHaveLength(1);
    await performCommonChecks(table);
  });
});
