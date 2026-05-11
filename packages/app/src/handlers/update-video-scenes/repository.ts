import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type {
  MatcherResultRequest,
  MatcherResultRequestItem,
  Scenes,
} from '../../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { config } from '../../config/config';
import { MatchingStatusNum } from '../../models/matching-status-num';
import type { VideoEntity } from '../../models/video-entity';
import { docClient, getVideoKey } from '../../shared/repository';

const logger = createLogger('handlers/update-video-scenes/repository');

type UpdateCommandInput = ConstructorParameters<typeof UpdateCommand>[0];

const getStatus = (item: MatcherResultRequestItem): MatchingStatusNum => {
  if (!item.scenes) {
    return MatchingStatusNum.Failed;
  }

  if (item.scenes.opening || item.scenes.ending || item.scenes.sceneAfterEnding) {
    return MatchingStatusNum.ProcessedWithResults;
  }

  return MatchingStatusNum.ProcessedWithNoResults;
}

const buildScenes = (itemScenes: Scenes): VideoEntity['scenes'] => {
  const scenes: VideoEntity['scenes'] = {};

  if (itemScenes.opening) {
    scenes.opening = {
      start: itemScenes.opening.start,
      end: itemScenes.opening.end,
    };
  }

  if (itemScenes.ending) {
    scenes.ending = {
      start: itemScenes.ending.start,
      end: itemScenes.ending.end,
    };
  }

  if (itemScenes.sceneAfterEnding) {
    scenes.sceneAfterEnding = {
      start: itemScenes.sceneAfterEnding.start,
      end: itemScenes.sceneAfterEnding.end,
    };
  }

  return scenes;
};

const buildUpdateBaseInput = (item: MatcherResultRequestItem, status: MatchingStatusNum): UpdateCommandInput => {
  return {
    TableName: config.value.database.tableName,
    Key: { primaryKey: getVideoKey(item.videoKey) },
    ConditionExpression: 'attribute_exists(primaryKey)',
    ReturnValues: 'NONE',
    UpdateExpression: 'SET matchingStatus = :status, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString(),
    },
  };
};

const buildSuccessCleanupUpdate = (item: MatcherResultRequestItem, scenes: VideoEntity['scenes']): UpdateCommand => {
  const baseInput = buildUpdateBaseInput(item, MatchingStatusNum.ProcessedWithResults);

  return new UpdateCommand({
    ...baseInput,
    UpdateExpression: `${baseInput.UpdateExpression}, scenes = :scenes REMOVE matchingGroup`,
    ExpressionAttributeValues: {
      ...baseInput.ExpressionAttributeValues,
      ':scenes': scenes,
    },
  });
};

const buildNoResultsCleanupUpdate = (item: MatcherResultRequestItem): UpdateCommand => {
  const baseInput = buildUpdateBaseInput(item, MatchingStatusNum.ProcessedWithNoResults);

  return new UpdateCommand({
    ...baseInput,
    UpdateExpression: `${baseInput.UpdateExpression} REMOVE matchingGroup`,
  });
};

const buildRetryFailureUpdate = (item: MatcherResultRequestItem): UpdateCommand => {
  return new UpdateCommand(buildUpdateBaseInput(item, MatchingStatusNum.Failed));
};

const createUpdateCommandForItem = (item: MatcherResultRequestItem): UpdateCommand => {
  const status = getStatus(item);

  if (status === MatchingStatusNum.ProcessedWithResults && item.scenes) {
    return buildSuccessCleanupUpdate(item, buildScenes(item.scenes));
  }

  if (status === MatchingStatusNum.ProcessedWithNoResults) {
    return buildNoResultsCleanupUpdate(item);
  }

  return buildRetryFailureUpdate(item);
};

const createUpdateCommands = (items: MatcherResultRequestItem[]): UpdateCommand[] => {
  return items.map(createUpdateCommandForItem);
};

const updateItem = async (command: UpdateCommand): Promise<void> => {
  const result = await docClient.send(command);
  logger.info('Updated item', { result });
};

const updateItems = async (request: MatcherResultRequest, updateCommands: UpdateCommand[]): Promise<void> => {
  for (const [index, command] of updateCommands.entries()) {
    try {
      await updateItem(command);
    } catch (err) {
      logger.error('Failed to update item', err, {
        index,
        videoKey: request.items[index]?.videoKey,
      });
    }
  }
};

export const updateVideoScenes = async (request: MatcherResultRequest): Promise<void> => {
  if (!request?.items?.length) {
    logger.info('No items to update');
    return;
  }

  const updateCommands = createUpdateCommands(request.items);
  await updateItems(request, updateCommands);
  logger.info('All items processed');
};
