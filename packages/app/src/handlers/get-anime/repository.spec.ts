import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const getInput: unknown[] = [];
const scanInput: unknown[] = [];

class GetCommandMock {
  input: unknown;

  constructor(input: unknown) {
    this.input = input;
    getInput.push(input);
  }
}

class ScanCommandMock {
  input: unknown;

  constructor(input: unknown) {
    this.input = input;
    scanInput.push(input);
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
  GetCommand: GetCommandMock,
  ScanCommand: ScanCommandMock,
}));

describe('packages/app/src/handlers/get-anime/repository.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    getInput.length = 0;
    scanInput.length = 0;
  });

  it('loads anime details and registered episodes', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: { status: 3, messageId: 22 } })
      .mockResolvedValueOnce({ Items: [{ episode: 1 }, { episode: 2 }] });

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
    await expect(module.getAnimeForUser({ myAnimeListId: 9, dub: 'Dub', episode: 7 })).resolves.toEqual({
      status: 3,
      messageId: 22,
    });
    await expect(module.getRegisteredEpisodes(9, 'Dub')).resolves.toEqual([1, 2]);

    expect(getInput).toHaveLength(1);
    expect(scanInput).toHaveLength(1);
  });

  it('returns no registered episodes when the scan has no items', async () => {
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
    await expect(module.getRegisteredEpisodes(9, 'Dub')).resolves.toEqual([]);
  });
});
