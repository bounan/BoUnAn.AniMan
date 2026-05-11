import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
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
    send = sendMock;
  },
}));

describe('publishJsonMessage', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset().mockResolvedValue({});
    publishInputs.length = 0;
  });

  it('publishes JSON messages to SNS', async () => {
    const module = await import('./sns-publisher');

    await module.publishJsonMessage('arn:topic', { hello: 'world' });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(publishInputs[0]).toEqual({
      TopicArn: 'arn:topic',
      Message: JSON.stringify({
        default: JSON.stringify({ hello: 'world' }),
      }),
      MessageStructure: 'json',
    });
  });
});
