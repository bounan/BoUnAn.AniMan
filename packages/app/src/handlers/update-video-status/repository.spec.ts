import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const updateInput: unknown[] = [];

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
  DynamoDBDocumentClient: {
    from: () => ({
      send: sendMock,
    }),
  },
  UpdateCommand: UpdateCommandMock,
}));

describe('packages/app/src/handlers/update-video-status/repository.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    updateInput.length = 0;
  });

  it('marks videos as downloaded and failed', async () => {
    sendMock
      .mockResolvedValueOnce({ Attributes: { status: 3 } })
      .mockResolvedValueOnce({ Attributes: { status: 4 } });

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
    await expect(module.markVideoDownloaded({ myAnimeListId: 1, dub: 'Dub', episode: 1 }, 99)).resolves.toEqual({
      status: 3,
    });
    await expect(module.markVideoFailed({ myAnimeListId: 1, dub: 'Dub', episode: 2 })).resolves.toEqual({
      status: 4,
    });

    const downloadedUpdate = updateInput[0] as {
      UpdateExpression: string;
      ExpressionAttributeNames: Record<string, string>;
    };
    expect(downloadedUpdate.UpdateExpression).toContain('REMOVE #sortKey');
    expect(downloadedUpdate.ExpressionAttributeNames['#sortKey']).toBe('sortKey');
  });
});
