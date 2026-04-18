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

describe('packages/app/src/handlers/update-video-status/sns-client.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    snsSendMock.mockReset().mockResolvedValue({});
    publishInputs.length = 0;
  });

  it('publishes the video-downloaded notification', async () => {
    const configModule = await import('../../config/config');
    Object.defineProperty(configModule.config, 'value', {
      configurable: true,
      get: () => ({
        topics: {
          videoDownloadedTopicArn: 'arn:downloaded',
        },
      }),
    });

    const module = await import('./sns-client');
    const notification = {
      videoKey: { myAnimeListId: 1, dub: 'Dub', episode: 1 },
      messageId: 10,
      scenes: {},
      publishingDetails: { threadId: 5, messageId: 6 },
    };

    await module.sendVideoDownloadedNotification(notification);

    expect(publishInputs[0]).toEqual({
      TopicArn: 'arn:downloaded',
      Message: JSON.stringify({
        default: JSON.stringify(notification),
      }),
      MessageStructure: 'json',
    });
  });
});
