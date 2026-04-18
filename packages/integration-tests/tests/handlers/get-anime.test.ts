import { describe, expect } from 'vitest';

import { handler } from '../../../app/src/handlers/get-anime/handler';
import { it } from '../../fixtures';
import { expectNoDbChanges, performCommonChecks } from '../../tools/custom-expectations';

describe('get-anime', () => {
  it('REQ-GA-00: rejects invalid requests', async ({ table }) => {
    const initialState = await table.getAllRecords();

    await expect(handler({
      videoKey: { myAnimeListId: 0, dub: '', episode: 1 },
    }, null as never, null as never)).rejects.toThrow('Invalid request');

    await expectNoDbChanges(initialState, table);
  });

  it('REQ-GA-01: returns stored downloaded video details', async ({ table, aws, config }) => {
    const published = aws.captureSns(config.topics.videoRegisteredTopicArn);
    await table.putRecords({
      primaryKey: '1#Dub#3',
      animeKey: '1#Dub',
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 3,
      status: 3,
      matchingStatus: 3,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
      messageId: 100,
      scenes: { opening: { start: 1, end: 2 } },
      publishingDetails: { threadId: 11, messageId: 22 },
    });
    const initialState = await table.getAllRecords();

    const response = await handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 3 },
    }, null as never, null as never);

    expect(response).toEqual({
      status: 'Downloaded',
      messageId: 100,
      scenes: { opening: { start: 1, end: 2 } },
      publishingDetails: { threadId: 11, messageId: 22 },
    });
    expect(published.messages).toHaveLength(0);
    await expectNoDbChanges(initialState, table);
  });

  it('REQ-GA-02: returns stored failed video details', async ({ table, aws, config }) => {
    aws.captureSns(config.topics.videoRegisteredTopicArn);
    await table.putRecords({
      primaryKey: '1#Dub#4',
      animeKey: '1#Dub',
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 4,
      status: 4,
      matchingStatus: 5,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
      messageId: 101,
    });

    const response = await handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 4 },
    }, null as never, null as never);

    expect(response).toEqual({
      status: 'Failed',
      messageId: 101,
      scenes: undefined,
      publishingDetails: undefined,
    });
  });

  it('REQ-GA-03/04: prioritises pending and downloading videos', async ({ table, aws, config }) => {
    aws.captureSns(config.topics.videoRegisteredTopicArn);
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
        status: 2,
        matchingStatus: 1,
        sortKey: '1#2025-01-01T00:00:00.000Z#0002',
        matchingGroup: '1#Dub',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    );

    const pending = await handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
    }, null as never, null as never) as { status: string };
    const downloading = await handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 2 },
    }, null as never, null as never) as { status: string };

    expect(pending.status).toBe('Pending');
    expect(downloading.status).toBe('Downloading');

    const rows = await table.getAllRecords();
    expect(rows.find(x => x.primaryKey === '1#Dub#1')?.sortKey?.startsWith('0#')).toBe(true);
    expect(rows.find(x => x.primaryKey === '1#Dub#2')?.sortKey?.startsWith('0#')).toBe(true);
    await performCommonChecks(table);
  });

  it('REQ-GA-05: returns not available when Loan API has no episodes', async ({ table, aws, config }) => {
    const published = aws.captureSns(config.topics.videoRegisteredTopicArn);
    aws.mockLambda<number[]>(config.loanApiConfig.functionArn, []);
    const initialState = await table.getAllRecords();

    const response = await handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 5 },
    }, null as never, null as never);

    expect(response).toEqual({
      status: 'NotAvailable',
      messageId: undefined,
      scenes: undefined,
      publishingDetails: undefined,
    });
    expect(published.messages).toHaveLength(0);
    await expectNoDbChanges(initialState, table);
  });

  it(
    'REQ-GA-06: inserts missing episodes, prioritises requested one, and emits notification',
    async ({ table, aws, config }) => {
      const lambda = aws.mockLambda<number[]>(config.loanApiConfig.functionArn, [1, 2, 3]);
      const published = aws.captureSns(config.topics.videoRegisteredTopicArn);
      await table.putRecords({
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
      });

      const response = await handler({
        videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 3 },
      }, null as never, null as never) as { status: string };

      expect(lambda.requests).toEqual([{ myAnimeListId: 1, dub: 'Dub' }]);
      expect(response.status).toBe('Pending');

      const rows = await table.getAllRecords();
      expect(rows.map(x => x.primaryKey)).toEqual(['1#Dub#1', '1#Dub#2', '1#Dub#3']);
      expect(rows.find(x => x.primaryKey === '1#Dub#3')?.sortKey?.startsWith('0#')).toBe(true);
      expect(published.messages).toHaveLength(1);

      const message = published.messages[0] as { Message: string };
      expect(JSON.parse(message.Message)).toEqual({
        default: JSON.stringify({
          items: [
            { videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 } },
            { videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 3 } },
          ],
        }),
      });

      await performCommonChecks(table);
    });

  it('REQ-GA-07: rejects stored videos with an unsupported status', async ({ table }) => {
    await table.putRecords({
      primaryKey: '1#Dub#6',
      animeKey: '1#Dub',
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 6,
      status: 0,
      matchingStatus: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    });

    await expect(handler({
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 6 },
    }, null as never, null as never)).rejects.toThrow('Incorrect status');
  });
});
