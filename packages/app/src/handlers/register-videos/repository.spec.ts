import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const batchGetInput: unknown[] = [];

class BatchGetCommandMock {
  input: unknown;

  constructor(input: unknown) {
    this.input = input;
    batchGetInput.push(input);
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
}));

describe('packages/app/src/handlers/register-videos/repository.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    batchGetInput.length = 0;
  });

  it('chunks existing video reads and maps found keys back to inputs', async () => {
    sendMock
      .mockResolvedValueOnce({
        Responses: {
          videos: [{ primaryKey: '1#Dub#1' }, { primaryKey: '1#Dub#100' }],
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
    const items = Array.from({ length: 101 }, (_, index) => ({
      myAnimeListId: 1,
      dub: 'Dub',
      episode: index + 1,
    }));

    const existing = await module.getExistingVideos(items);

    expect(batchGetInput).toHaveLength(2);
    expect(existing).toEqual([items[0], items[99], items[100]]);
  });

  it('returns no existing videos when batch lookups return no matches', async () => {
    sendMock.mockResolvedValueOnce({
      Responses: {
        videos: [],
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
    await expect(module.getExistingVideos([
      { myAnimeListId: 1, dub: 'Dub', episode: 1 },
    ])).resolves.toEqual([]);
  });
});
