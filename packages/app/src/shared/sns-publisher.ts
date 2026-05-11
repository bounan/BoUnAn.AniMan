import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

import { createLogger } from './logger';

const logger = createLogger('shared/sns-publisher');

export const publishJsonMessage = async <T>(topicArn: string, payload: T): Promise<void> => {
  const message = {
    default: JSON.stringify(payload),
  };

  const command = new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(message),
    MessageStructure: 'json',
  });

  const snsClient = new SNSClient();
  await snsClient.send(command);
  logger.info('Notification sent', { message });
};

