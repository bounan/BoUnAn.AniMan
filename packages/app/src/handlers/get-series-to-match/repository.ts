import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { config } from '../../config/config';
import { MatchingStatusNum } from '../../models/matching-status-num';
import type { VideoEntity } from '../../models/video-entity';
import { docClient } from '../../shared/repository';

type GetEpisodesToMatchResult = Pick<VideoEntity, 'myAnimeListId' | 'dub' | 'episode'>[];

const getRetryThreshold = (): string => {
  return new Date(Date.now() - config.value.matchingRetry.retryDelayMs).toISOString();
};

export const getEpisodesToMatch = async (): Promise<GetEpisodesToMatchResult> => {
  const retryThreshold = getRetryThreshold();

  const pendingVideosResponse = await docClient.send(new ScanCommand({
    TableName: config.value.database.tableName,
    IndexName: config.value.database.matcherSecondaryIndexName,
    Limit: 100,
    FilterExpression: '#S = :pending OR (#S = :failed AND #matchingPerformedAttempts < :maxAttempts AND #updatedAt < :retryThreshold)',
    ExpressionAttributeNames: {
      '#S': 'matchingStatus',
      '#matchingPerformedAttempts': 'matchingPerformedAttempts',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':pending': MatchingStatusNum.Pending,
      ':failed': MatchingStatusNum.Failed,
      ':maxAttempts': config.value.matchingRetry.maxAttempts,
      ':retryThreshold': retryThreshold,
    },
    Select: 'ALL_PROJECTED_ATTRIBUTES',
  }));

  const firstVideo = pendingVideosResponse.Items?.[0] as Pick<VideoEntity, 'primaryKey' | 'updatedAt' | 'myAnimeListId' | 'dub' | 'episode' | 'matchingStatus' | 'matchingGroup'> | undefined;
  if (!firstVideo) {
    return [];
  }

  const groupVideos = await docClient.send(new ScanCommand({
    TableName: config.value.database.tableName,
    IndexName: config.value.database.matcherSecondaryIndexName,
    FilterExpression: 'matchingGroup = :group AND (#S = :pending OR (#S = :failed AND #matchingPerformedAttempts < :maxAttempts AND #updatedAt < :retryThreshold))',
    ExpressionAttributeNames: {
      '#S': 'matchingStatus',
      '#matchingPerformedAttempts': 'matchingPerformedAttempts',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':group': firstVideo.matchingGroup,
      ':pending': MatchingStatusNum.Pending,
      ':failed': MatchingStatusNum.Failed,
      ':maxAttempts': config.value.matchingRetry.maxAttempts,
      ':retryThreshold': retryThreshold,
    },
    Select: 'ALL_PROJECTED_ATTRIBUTES',
  })) as unknown as { Items: VideoEntity[] };
  if (!groupVideos.Items || groupVideos.Items.length === 0) {
    return [];
  }

  // Potential race condition here, but acceptable for now
  for (const video of groupVideos.Items) {
    await docClient.send(new UpdateCommand({
      TableName: config.value.database.tableName,
      Key: { primaryKey: video.primaryKey },
      UpdateExpression: 'SET #S = :processing, updatedAt = :now',
      ConditionExpression: 'updatedAt = :oldUpdatedAt AND (#S = :pending OR (#S = :failed AND #matchingPerformedAttempts < :maxAttempts AND updatedAt < :retryThreshold))',
      ExpressionAttributeNames: {
        '#S': 'matchingStatus',
        '#matchingPerformedAttempts': 'matchingPerformedAttempts',
      },
      ExpressionAttributeValues: {
        ':pending': MatchingStatusNum.Pending,
        ':failed': MatchingStatusNum.Failed,
        ':maxAttempts': config.value.matchingRetry.maxAttempts,
        ':retryThreshold': retryThreshold,
        ':processing': MatchingStatusNum.Processing,
        ':oldUpdatedAt': video.updatedAt,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'NONE',
    }));
  }

  return groupVideos.Items.map(v => ({
    myAnimeListId: v.myAnimeListId,
    dub: v.dub,
    episode: v.episode,
  }));
}
