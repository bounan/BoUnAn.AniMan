import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { vi } from 'vitest';

type RequestsRegistry<Request> = {
  requests: Request[];
};

type PublishRegistry = {
  messages: unknown[];
};

export class AwsInterceptor implements Disposable {
  private readonly ssmSpy;
  private readonly lambdaSpy;
  private readonly snsSpy;

  private readonly ssmResponses = new Map<string, object>();
  private readonly lambdaResponses = new Map<string, { requests: unknown[]; response: object }>();
  private readonly snsResponses = new Map<string, unknown[]>();

  private constructor() {
    this.ssmSpy = vi.spyOn(SSMClient.prototype, 'send').mockImplementation(async (command: object) => {
      if (!(command instanceof GetParameterCommand)) {
        throw new Error(`Unexpected SSM command: ${command.constructor.name}`);
      }

      const value = this.ssmResponses.get(command.input.Name!);
      if (!value) {
        throw new Error(`No SSM mock configured for ${command.input.Name}`);
      }

      return {
        Parameter: {
          Value: JSON.stringify(value),
        },
      };
    });

    this.lambdaSpy = vi.spyOn(LambdaClient.prototype, 'send').mockImplementation(async (command: object) => {
      if (!(command instanceof InvokeCommand)) {
        throw new Error(`Unexpected Lambda command: ${command.constructor.name}`);
      }

      const entry = this.lambdaResponses.get(command.input.FunctionName!);
      if (!entry) {
        throw new Error(`No Lambda mock configured for ${command.input.FunctionName}`);
      }

      const payload = command.input.Payload
        ? JSON.parse(Buffer.from(command.input.Payload as Uint8Array).toString())
        : undefined;
      entry.requests.push(payload);

      return {
        Payload: Buffer.from(JSON.stringify(entry.response)),
      };
    });

    this.snsSpy = vi.spyOn(SNSClient.prototype, 'send').mockImplementation(async (command: object) => {
      if (!(command instanceof PublishCommand)) {
        throw new Error(`Unexpected SNS command: ${command.constructor.name}`);
      }

      const topicArn = command.input.TopicArn!;
      const messages = this.snsResponses.get(topicArn);
      if (!messages) {
        throw new Error(`No SNS mock configured for ${topicArn}`);
      }

      messages.push(command.input);
      return {};
    });
  }

  static create(): AwsInterceptor {
    return new AwsInterceptor();
  }

  [Symbol.dispose](): void {
    this.ssmSpy.mockRestore();
    this.lambdaSpy.mockRestore();
    this.snsSpy.mockRestore();
  }

  mockSsm(parameterName: string, parameterValue: object): void {
    this.ssmResponses.set(parameterName, parameterValue);
  }

  mockLambda<Request>(lambdaName: string, response: object): RequestsRegistry<Request> {
    const entry = { requests: [] as Request[], response };
    this.lambdaResponses.set(lambdaName, entry as { requests: unknown[]; response: object });
    return entry;
  }

  captureSns(topicArn: string): PublishRegistry {
    const messages: unknown[] = [];
    this.snsResponses.set(topicArn, messages);
    return { messages };
  }
}
