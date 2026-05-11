import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type { VideoKey } from '../../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { config } from '../../config/config';
import type { VideoEntity } from '../../models/video-entity';
import { VideoStatusNum } from '../../models/video-status-num';
import { docClient, getVideoKey } from '../../shared/repository';

const logger = createLogger('handlers/update-video-status/repository');

type UpdateCommandInput = ConstructorParameters<typeof UpdateCommand>[0];

const buildMarkVideoBaseInput = (
  request: VideoKey,
  status: VideoStatusNum,
  messageId: number | null,
): UpdateCommandInput => {
  return {
    TableName: config.value.database.tableName,
    Key: { primaryKey: getVideoKey(request) },
    ConditionExpression: 'attribute_exists(primaryKey)',
    UpdateExpression: 'SET #status = :status, #messageId = :messageId, #updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#messageId': 'messageId',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':messageId': messageId,
      ':updatedAt': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  };
};

const buildSuccessCleanupUpdate = (request: VideoKey, messageId: number): UpdateCommand => {
  const baseInput = buildMarkVideoBaseInput(request, VideoStatusNum.Downloaded, messageId);

  return new UpdateCommand({
    ...baseInput,
    UpdateExpression: `${baseInput.UpdateExpression} REMOVE #sortKey`,
    ExpressionAttributeNames: {
      ...baseInput.ExpressionAttributeNames,
      '#sortKey': 'sortKey',
    },
  });
};

const buildRetryFailureUpdate = (request: VideoKey): UpdateCommand => {
  return new UpdateCommand(buildMarkVideoBaseInput(request, VideoStatusNum.Failed, null));
};

const executeMarkVideoUpdate = async (command: UpdateCommand): Promise<VideoEntity> => {
  const result = await docClient.send(command);
  logger.info('Update result', { result });

  return result.Attributes as VideoEntity;
};

export const markVideoDownloaded = async (request: VideoKey, messageId: number): Promise<VideoEntity> => {
  return executeMarkVideoUpdate(buildSuccessCleanupUpdate(request, messageId));
};

export const markVideoFailed = async (request: VideoKey): Promise<VideoEntity> => {
  return executeMarkVideoUpdate(buildRetryFailureUpdate(request));
};
