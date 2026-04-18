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

describe('packages/app/src/handlers/update-publishing-details/repository.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    updateInput.length = 0;
  });

  it('persists publishing details', async () => {
    sendMock.mockResolvedValue({});

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
    await module.savePublishingDetails(
      { myAnimeListId: 1, dub: 'Dub', episode: 1 },
      { threadId: 5, messageId: 6 },
    );

    const command = updateInput[0] as {
      ExpressionAttributeValues: Record<string, { threadId: number; messageId: number }>;
    };
    expect(command.ExpressionAttributeValues[':publishingDetails']).toEqual({
      threadId: 5,
      messageId: 6,
    });
  });
});
