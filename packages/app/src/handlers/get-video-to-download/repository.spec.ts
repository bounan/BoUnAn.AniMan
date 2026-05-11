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

describe('packages/app/src/handlers/get-video-to-download/repository.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    scanInput.length = 0;
    updateInput.length = 0;
  });

  it('locks the first download candidate when available', async () => {
    sendMock
      .mockResolvedValueOnce({
        Items: [{
          primaryKey: '1#Dub#5',
          updatedAt: '2024-01-01T00:00:00.000Z',
          myAnimeListId: 1,
          dub: 'Dub',
          episode: 5,
        }],
      })
      .mockResolvedValueOnce({});

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
          secondaryIndexName: 'status-index',
        },
        downloadRetry: {
          maxAttempts: 5,
          retryDelayMs: 60 * 60 * 1000,
        },
      }),
    });

    const module = await import('./repository');
    await expect(module.getEpisodeToDownloadAndLock()).resolves.toEqual({
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 5,
    });

    expect(scanInput).toHaveLength(1);
    expect(updateInput).toHaveLength(1);

    const scanCommand = scanInput[0] as {
      FilterExpression: string;
      ExpressionAttributeNames: Record<string, string>;
      ExpressionAttributeValues: Record<string, number | string>;
    };
    expect(scanCommand.FilterExpression).toBe('#S = :pending OR (#S = :failed AND #performedAttempts < :maxAttempts AND #updatedAt < :retryThreshold)');
    expect(scanCommand.ExpressionAttributeNames['#performedAttempts']).toBe('performedAttempts');
    expect(scanCommand.ExpressionAttributeNames['#updatedAt']).toBe('updatedAt');
    expect(scanCommand.ExpressionAttributeValues[':pending']).toBe(1);
    expect(scanCommand.ExpressionAttributeValues[':failed']).toBe(4);
    expect(scanCommand.ExpressionAttributeValues[':maxAttempts']).toBe(5);
    expect(typeof scanCommand.ExpressionAttributeValues[':retryThreshold']).toBe('string');

    const updateCommand = updateInput[0] as {
      ConditionExpression: string;
      ExpressionAttributeNames: Record<string, string>;
      ExpressionAttributeValues: Record<string, number | string>;
    };
    expect(updateCommand.ConditionExpression)
      .toBe('updatedAt = :oldUpdatedAt AND (#S = :pending OR (#S = :failed AND #performedAttempts < :maxAttempts AND updatedAt < :retryThreshold))');
    expect(updateCommand.ExpressionAttributeNames['#performedAttempts']).toBe('performedAttempts');
    expect(updateCommand.ExpressionAttributeValues[':failed']).toBe(4);
    expect(updateCommand.ExpressionAttributeValues[':maxAttempts']).toBe(5);
  });

  it('locks retryable failed videos after the cooldown window', async () => {
    sendMock
      .mockResolvedValueOnce({
        Items: [{
          primaryKey: '1#Dub#6',
          updatedAt: '2024-01-01T00:00:00.000Z',
          myAnimeListId: 1,
          dub: 'Dub',
          episode: 6,
          performedAttempts: 2,
        }],
      })
      .mockResolvedValueOnce({});

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
          secondaryIndexName: 'status-index',
        },
        downloadRetry: {
          maxAttempts: 5,
          retryDelayMs: 60 * 60 * 1000,
        },
      }),
    });

    const module = await import('./repository');
    await expect(module.getEpisodeToDownloadAndLock()).resolves.toEqual({
      myAnimeListId: 1,
      dub: 'Dub',
      episode: 6,
    });

    expect(updateInput).toHaveLength(1);
  });

  it('returns undefined when no download candidate exists', async () => {
    sendMock.mockResolvedValueOnce({ Items: [] });

    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        database: {
          tableName: 'videos',
          secondaryIndexName: 'status-index',
        },
        downloadRetry: {
          maxAttempts: 5,
          retryDelayMs: 60 * 60 * 1000,
        },
      }),
    });

    const module = await import('./repository');
    await expect(module.getEpisodeToDownloadAndLock()).resolves.toBeUndefined();
    expect(updateInput).toHaveLength(0);
  });
});
