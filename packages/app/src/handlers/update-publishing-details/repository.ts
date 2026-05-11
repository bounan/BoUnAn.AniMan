import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type { PublishingDetails, VideoKey } from '../../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { config } from '../../config/config';
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