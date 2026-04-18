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
      }),
    });

    const module = await import('./repository');
    await expect(module.getEpisodeToDownloadAndLock()).resolves.toBeUndefined();
    expect(updateInput).toHaveLength(0);
  });
});
