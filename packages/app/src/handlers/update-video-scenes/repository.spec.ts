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

describe('packages/app/src/handlers/update-video-scenes/repository.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    updateInput.length = 0;
  });

  it('updates scenes for each matcher outcome and keeps going after failures', async () => {
    sendMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('boom'));

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
    await module.updateVideoScenes({
      items: [{
        videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
        scenes: { opening: { start: 1, end: 2 } },
      }, {
        videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 2 },
        scenes: {},
      }, {
        videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 3 },
      }],
    });

    const successCommand = updateInput[0] as {
      UpdateExpression: string;
    };
    expect(successCommand.UpdateExpression).toContain('scenes = :scenes');

    const noResultsCommand = updateInput[1] as {
      UpdateExpression: string;
    };
    expect(noResultsCommand.UpdateExpression).toContain('REMOVE matchingGroup');

    const failedCommand = updateInput[2] as {
      UpdateExpression: string;
    };
    expect(failedCommand.UpdateExpression).not.toContain('REMOVE matchingGroup');
  });

  it('persists ending and scene-after-ending intervals when present', async () => {
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
    await module.updateVideoScenes({
      items: [{
        videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 4 },
        scenes: {
          ending: { start: 10, end: 20 },
          sceneAfterEnding: { start: 21, end: 30 },
        },
      }],
    });

    const command = updateInput[0] as {
      ExpressionAttributeValues: Record<string, { ending?: unknown; sceneAfterEnding?: unknown }>;
    };
    expect(command.ExpressionAttributeValues[':scenes']).toEqual({
      ending: { start: 10, end: 20 },
      sceneAfterEnding: { start: 21, end: 30 },
    });
  });

  it('short-circuits scene updates with empty input', async () => {
    const module = await import('./repository');
    await module.updateVideoScenes({ items: [] });
    expect(updateInput).toHaveLength(0);
  });
});
