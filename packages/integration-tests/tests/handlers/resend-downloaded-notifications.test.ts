import { describe, expect } from 'vitest';

import { handler } from '../../../app/src/handlers/manual-resend-downloaded-notifications/handler';
import { it } from '../../fixtures';
import { expectNoDbChanges, performCommonChecks } from '../../tools/custom-expectations';

const downloadedVideo = (episode: number, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  primaryKey: `1#Dub#${episode}`,
  animeKey: '1#Dub',
  myAnimeListId: 1,
  dub: 'Dub',
  episode,
  status: 3,
  matchingStatus: 3,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  messageId: 100 + episode,
  ...overrides,
});

const readPublishedDefaults = (messages: unknown[]): unknown[] => {
  return messages.map(message => {
    const input = message as { Message: string };
    return JSON.parse(JSON.parse(input.Message).default);
  });
};

describe('resend-downloaded-notifications', () => {
  it('REQ-RDN-01: resends downloaded notifications for anime and video string keys', async ({ table, aws, config }) => {
    const published = aws.captureSns(config.topics.videoDownloadedTopicArn);
    await table.putRecords(
      downloadedVideo(1, {
        scenes: { opening: { start: 1, end: 2 } },
        publishingDetails: { threadId: 7, messageId: 8 },
      }),
      downloadedVideo(2),
    );
    const initialState = await table.getAllRecords();

    await handler(['1#Dub', '1#Dub#1'], null as never, null as never);

    expect(readPublishedDefaults(published.messages)).toEqual([
      {
        videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
        messageId: 101,
        scenes: { opening: { start: 1, end: 2 } },
        publishingDetails: { threadId: 7, messageId: 8 },
      },
      {
        videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 2 },
        messageId: 102,
      },
    ]);
    await expectNoDbChanges(initialState, table);
    await performCommonChecks(table);
  });

  it('REQ-RDN-02: sends no notifications when any requested video is missing', async ({ table, aws, config }) => {
    const published = aws.captureSns(config.topics.videoDownloadedTopicArn);
    await table.putRecords(downloadedVideo(1));
    const initialState = await table.getAllRecords();

    await expect(handler(['1#Dub#1', '1#Dub#2'], null as never, null as never))
      .rejects.toThrow('Requested key was not found as downloaded');

    expect(published.messages).toEqual([]);
    await expectNoDbChanges(initialState, table);
  });

  it('REQ-RDN-03: sends no notifications when any resolved video is not downloaded', async ({ table, aws, config }) => {
    const published = aws.captureSns(config.topics.videoDownloadedTopicArn);
    await table.putRecords(
      downloadedVideo(1),
      downloadedVideo(2, { status: 1, messageId: undefined }),
    );
    const initialState = await table.getAllRecords();

    await expect(handler(['1#Dub'], null as never, null as never))
      .rejects.toThrow('Requested key was not found as downloaded');

    expect(published.messages).toEqual([]);
    await expectNoDbChanges(initialState, table);
  });
});
