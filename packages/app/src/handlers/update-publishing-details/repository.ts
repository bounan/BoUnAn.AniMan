import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type { PublishingDetails, VideoKey } from '../../../../../third-party/common/ts/interfaces';
import { config } from '../../config/config';
import { createLogger } from '../../shared/logger';
import { docClient, getVideoKey } from '../../shared/repository';

const logger = createLogger('handlers/update-publishing-details/repository');

export const savePublishingDetails = async (videoKey: VideoKey, details: PublishingDetails): Promise<void> => {
  const result = await docClient.send(new UpdateCommand({
    TableName: config.value.database.tableName,
    Key: { primaryKey: getVideoKey(videoKey) },
    ConditionExpression: 'attribute_exists(primaryKey)',
    UpdateExpression: 'SET #publishingDetails = :publishingDetails, #updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#publishingDetails': 'publishingDetails',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':publishingDetails': {
        threadId: details.threadId,
        messageId: details.messageId,
      },
      ':updatedAt': new Date().toISOString(),
    },
  }));

  logger.info('Update result', { result });
}