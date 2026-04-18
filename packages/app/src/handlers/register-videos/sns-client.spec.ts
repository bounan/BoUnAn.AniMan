import { beforeEach, describe, expect, it, vi } from 'vitest';

const snsSendMock = vi.fn();
const publishInputs: unknown[] = [];

class PublishCommandMock {
  input: unknown;

  constructor(input: unknown) {
    this.input = input;
    publishInputs.push(input);
  }
}

vi.mock('@aws-sdk/client-sns', () => ({
  PublishCommand: PublishCommandMock,
  SNSClient: class {
    send = snsSendMock;
  },
}));

describe('packages/app/src/handlers/register-videos/sns-client.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    snsSendMock.mockReset().mockResolvedValue({});
    publishInputs.length = 0;
  });

  it('publishes video registered notifications', async () => {
    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        topics: {
          videoRegisteredTopicArn: 'arn:registered',
        },
      }),
    });

    const module = await import('./sns-client');
    const payload = [{ myAnimeListId: 1, dub: 'Dub', episode: 1 }];

    await module.sendVideoRegisteredNotification(payload);

    expect(publishInputs[0]).toEqual({
      TopicArn: 'arn:registered',
      Message: JSON.stringify({
        default: JSON.stringify({
          items: [{ videoKey: payload[0] }],
        }),
      }),
      MessageStructure: 'json',
    });
  });
});
