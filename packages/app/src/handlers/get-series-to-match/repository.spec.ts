import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const scanInput: unknown[] = [];
const updateInput: unknown[] = [];

class ScanCommandMock {
  input: unknown;

  constructor(input: unknown) {
    this.input = input;
    scanInput.push(input);
  }
}

class UpdateCommandMock {
  input: unknown;

  constructor(input: unknown) {
    this.input = input;
    updateInput.push(input);
  }
}

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {},
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => ({
      send: sendMock,
    }),
  },
  ScanCommand: ScanCommandMock,
  UpdateCommand: UpdateCommandMock,
}));

describe('packages/app/src/handlers/get-series-to-match/repository.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    scanInput.length = 0;
    updateInput.length = 0;
  });

  it('loads matcher groups, updates them, and returns work items', async () => {
    sendMock
      .mockResolvedValueOnce({
        Items: [{
          primaryKey: '1#Dub#1',
          updatedAt: '2024-01-01T00:00:00.000Z',
          myAnimeListId: 1,
          dub: 'Dub',
          episode: 1,
          matchingGroup: '1#Dub',
        }],
      })
      .mockResolvedValueOnce({
        Items: [{
          primaryKey: '1#Dub#1',
          updatedAt: '2024-01-01T00:00:00.000Z',
          myAnimeListId: 1,
          dub: 'Dub',
          episode: 1,
        }, {
          primaryKey: '1#Dub#2',
          updatedAt: '2024-01-01T00:00:01.000Z',
          myAnimeListId: 1,
          dub: 'Dub',
          episode: 2,
        }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
          matcherSecondaryIndexName: 'matcher-index',
        },
        matchingRetry: {
          maxAttempts: 5,
          retryDelayMs: 60 * 60 * 1000,
        },
      }),
    });

    const module = await import('./repository');
    await expect(module.getEpisodesToMatch()).resolves.toEqual([
      { myAnimeListId: 1, dub: 'Dub', episode: 1 },
      { myAnimeListId: 1, dub: 'Dub', episode: 2 },
    ]);

    expect(scanInput).toHaveLength(2);
    expect(updateInput).toHaveLength(2);

    const firstScan = scanInput[0] as {
      FilterExpression: string;
      ExpressionAttributeNames: Record<string, string>;
      ExpressionAttributeValues: Record<string, number | string>;
    };
    expect(firstScan.FilterExpression)
      .toBe('#S = :pending OR (#S = :failed AND #matchingPerformedAttempts < :maxAttempts AND #updatedAt < :retryThreshold)');
    expect(firstScan.ExpressionAttributeNames['#matchingPerformedAttempts']).toBe('matchingPerformedAttempts');
    expect(firstScan.ExpressionAttributeValues[':failed']).toBe(5);
    expect(firstScan.ExpressionAttributeValues[':maxAttempts']).toBe(5);

    const updateCommand = updateInput[0] as {
      ConditionExpression: string;
      ExpressionAttributeNames: Record<string, string>;
    };
    expect(updateCommand.ConditionExpression)
      .toBe('updatedAt = :oldUpdatedAt AND (#S = :pending OR (#S = :failed AND #matchingPerformedAttempts < :maxAttempts AND updatedAt < :retryThreshold))');
    expect(updateCommand.ExpressionAttributeNames['#matchingPerformedAttempts']).toBe('matchingPerformedAttempts');
  });

  it('returns no matcher work when scans are empty', async () => {
    sendMock.mockResolvedValueOnce({ Items: [] });

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
          matcherSecondaryIndexName: 'matcher-index',
        },
        matchingRetry: {
          maxAttempts: 5,
          retryDelayMs: 60 * 60 * 1000,
        },
      }),
    });

    const module = await import('./repository');
    await expect(module.getEpisodesToMatch()).resolves.toEqual([]);
  });

  it('stops matcher processing when the group scan is empty', async () => {
    sendMock
      .mockResolvedValueOnce({
        Items: [{
          primaryKey: '1#Dub#1',
          updatedAt: '2024-01-01T00:00:00.000Z',
          myAnimeListId: 1,
          dub: 'Dub',
          episode: 1,
          matchingGroup: '1#Dub',
        }],
      })
      .mockResolvedValueOnce({ Items: [] });

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
          matcherSecondaryIndexName: 'matcher-index',
        },
        matchingRetry: {
          maxAttempts: 5,
          retryDelayMs: 60 * 60 * 1000,
        },
      }),
    });

    const module = await import('./repository');
    await expect(module.getEpisodesToMatch()).resolves.toEqual([]);
    expect(updateInput).toHaveLength(0);
  });

  it('loads retryable failed matcher groups and marks them as processing', async () => {
    sendMock
      .mockResolvedValueOnce({
        Items: [{
          primaryKey: '1#Dub#3',
          updatedAt: '2024-01-01T00:00:00.000Z',
          myAnimeListId: 1,
          dub: 'Dub',
          episode: 3,
          matchingGroup: '1#Dub',
          matchingPerformedAttempts: 2,
        }],
      })
      .mockResolvedValueOnce({
        Items: [{
          primaryKey: '1#Dub#3',
          updatedAt: '2024-01-01T00:00:00.000Z',
          myAnimeListId: 1,
          dub: 'Dub',
          episode: 3,
          matchingPerformedAttempts: 2,
        }],
      })
      .mockResolvedValueOnce({});

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
          matcherSecondaryIndexName: 'matcher-index',
        },
        matchingRetry: {
          maxAttempts: 5,
          retryDelayMs: 60 * 60 * 1000,
        },
      }),
    });

    const module = await import('./repository');
    await expect(module.getEpisodesToMatch()).resolves.toEqual([
      { myAnimeListId: 1, dub: 'Dub', episode: 3 },
    ]);

    expect(updateInput).toHaveLength(1);
  });
});
