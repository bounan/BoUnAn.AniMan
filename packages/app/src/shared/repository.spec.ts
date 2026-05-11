import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const batchWriteInput: unknown[] = [];
const updateInput: unknown[] = [];

class BatchWriteCommandMock {
  input: unknown;

  constructor(input: unknown) {
    this.input = input;
    batchWriteInput.push(input);
  }
}

class UpdateCommandMock {
  input: Record<string, unknown>;

  constructor(input: Record<string, unknown>) {
    this.input = input;
    updateInput.push(input);
  }
}

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {},
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  BatchWriteCommand: BatchWriteCommandMock,
  DynamoDBDocumentClient: {
    from: () => ({
      send: sendMock,
    }),
  },
  UpdateCommand: UpdateCommandMock,
}));

describe('packages/app/src/shared/repository.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    batchWriteInput.length = 0;
    updateInput.length = 0;
  });

  it('builds stable keys', async () => {
    const repository = await import('./repository');

    expect(repository.getVideoKey({ myAnimeListId: 7, dub: 'Dub', episode: 3 })).toBe('7#Dub#3');
    expect(repository.getAnimeKey(7, 'Dub')).toBe('7#Dub');
  });

  it('returns undefined downloader key for non-pending statuses', async () => {
    const repository = await import('./repository');
    const { VideoStatusNum } = await import('../models/video-status-num');

    expect(repository.getDownloaderKey(VideoStatusNum.Downloaded, false, '2026-01-01T00:00:00.000Z', 1)).toBeUndefined();
  });

  it('batches inserts in groups of 25 and sends all commands', async () => {
    sendMock.mockResolvedValue({});

    const configModule = await import('../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: { tableName: 'videos' },
      }),
    });

    const repository = await import('./repository');
    const items = Array.from({ length: 26 }, (_, index) => ({
      myAnimeListId: 1,
      dub: 'Dub',
      episode: index + 1,
    }));

    await repository.insertVideo(items);

    expect(batchWriteInput).toHaveLength(2);
    expect(sendMock).toHaveBeenCalledTimes(2);

    const firstBatch = batchWriteInput[0] as {
      RequestItems: Record<string, { PutRequest: { Item: { primaryKey: string } } }[]>;
    };
    expect(firstBatch.RequestItems.videos).toHaveLength(25);
    expect(firstBatch.RequestItems.videos[0].PutRequest.Item.primaryKey).toBe('1#Dub#1');
  });

  it('updates the subscriber priority sort key', async () => {
    sendMock.mockResolvedValue({});

    const configModule = await import('../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: { tableName: 'videos' },
      }),
    });

    const repository = await import('./repository');
    await repository.increasePriority({ myAnimeListId: 5, dub: 'Sub', episode: 12 });

    const command = updateInput[0] as {
      Key: { primaryKey: string };
      ExpressionAttributeValues: Record<string, string>;
    };
    expect(command.Key.primaryKey).toBe('5#Sub#12');
    expect(command.ExpressionAttributeValues[':newSortKey']).toMatch(/^0#/);
  });
});
