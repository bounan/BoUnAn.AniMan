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

describe('packages/app/src/handlers/update-video-scenes/sns-client.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    snsSendMock.mockReset().mockResolvedValue({});
    publishInputs.length = 0;
  });

  it('publishes scene-recognized notifications', async () => {
    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        topics: {
          sceneRecognisedTopicArn: 'arn:scene',
        },
      }),
    });

    const module = await import('./sns-client');
    const items = [{
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
      scenes: { opening: { start: 1, end: 2 } },
    }];

    await module.sendSceneRecognizedNotification(items);

    expect(publishInputs[0]).toEqual({
      TopicArn: 'arn:scene',
      Message: JSON.stringify({
        default: JSON.stringify({ items }),
      }),
      MessageStructure: 'json',
    });
  });
});
