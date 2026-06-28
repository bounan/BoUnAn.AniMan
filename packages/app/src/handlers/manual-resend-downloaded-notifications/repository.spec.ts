import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const batchGetInput: unknown[] = [];
const queryInput: unknown[] = [];

class BatchGetCommandMock {
  input: unknown;

  constructor(input: unknown) {
    this.input = input;
    batchGetInput.push(input);
  }
}

class QueryCommandMock {
  input: unknown;

  constructor(input: unknown) {
    this.input = input;
    queryInput.push(input);
  }
}

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {},
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  BatchGetCommand: BatchGetCommandMock,
  DynamoDBDocumentClient: {
    from: () => ({
      send: sendMock,
    }),
  },
  QueryCommand: QueryCommandMock,
}));

describe('packages/app/src/handlers/manual-resend-downloaded-notifications/repository.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    batchGetInput.length = 0;
    queryInput.length = 0;
  });

  it('chunks video key reads and returns found videos', async () => {
    sendMock
      .mockResolvedValueOnce({
        Responses: {
          videos: [{ primaryKey: '1#Dub#1' }],
        },
      })
      .mockResolvedValueOnce({
        Responses: {
          videos: [{ primaryKey: '1#Dub#101' }],
        },
      });

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
        },
      }),
    });

    const module = await import('./repository');
    const videos = await module.getVideosByVideoKeys(Array.from({ length: 101 }, (_, index) => ({
      myAnimeListId: 1,
      dub: 'Dub',
      episode: index + 1,
    })));

    expect(batchGetInput).toHaveLength(2);
    expect(batchGetInput[0]).toEqual({
      RequestItems: {
        videos: {
          Keys: Array.from({ length: 100 }, (_, index) => ({ primaryKey: `1#Dub#${index + 1}` })),
        },
      },
    });
    expect(videos).toEqual([{ primaryKey: '1#Dub#1' }, { primaryKey: '1#Dub#101' }]);
  });

  it('returns no videos when batch response omits Responses', async () => {
    sendMock.mockResolvedValueOnce({});

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
        },
      }),
    });

    const module = await import('./repository');
    await expect(module.getVideosByVideoKeys([
      { myAnimeListId: 1, dub: 'Dub', episode: 1 },
    ])).resolves.toEqual([]);
  });

  it('returns no videos for empty video key input', async () => {
    const module = await import('./repository');

    await expect(module.getVideosByVideoKeys([])).resolves.toEqual([]);

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns no videos when anime key query finds nothing', async () => {
    sendMock.mockResolvedValueOnce({});

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
          animeKeyIndexName: 'anime-index',
        },
      }),
    });

    const module = await import('./repository');
    await expect(module.getVideosByAnimeKey({ myAnimeListId: 1, dub: 'Dub' })).resolves.toEqual([]);
    expect(batchGetInput).toEqual([]);
  });

  it('queries video keys by anime key and batch-gets full videos', async () => {
    sendMock
      .mockResolvedValueOnce({
        Items: [
          { myAnimeListId: 1, dub: 'Dub', episode: 1 },
          { myAnimeListId: 1, dub: 'Dub', episode: 2 },
        ],
      })
      .mockResolvedValueOnce({
        Responses: {
          videos: [
            { primaryKey: '1#Dub#1', messageId: 11 },
            { primaryKey: '1#Dub#2', messageId: 22 },
          ],
        },
      });

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
          animeKeyIndexName: 'anime-index',
        },
      }),
    });

    const module = await import('./repository');
    const videos = await module.getVideosByAnimeKey({ myAnimeListId: 1, dub: 'Dub' });

    expect(queryInput).toEqual([{
      TableName: 'videos',
      IndexName: 'anime-index',
      KeyConditionExpression: 'animeKey = :animeKey',
      ExpressionAttributeValues: {
        ':animeKey': '1#Dub',
      },
    }]);
    expect(batchGetInput).toEqual([{
      RequestItems: {
        videos: {
          Keys: [{ primaryKey: '1#Dub#1' }, { primaryKey: '1#Dub#2' }],
        },
      },
    }]);
    expect(videos).toEqual([{ primaryKey: '1#Dub#1', messageId: 11 }, { primaryKey: '1#Dub#2', messageId: 22 }]);
  });
});
