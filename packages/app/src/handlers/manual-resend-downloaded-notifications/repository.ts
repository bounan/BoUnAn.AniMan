import { BatchGetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

import type { VideoKey } from '../../../../../third-party/common/ts/interfaces';
import { splitToChunks } from '../../../../../third-party/common/ts/runtime/collection-helpers';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { config } from '../../config/config';
import type { VideoEntity } from '../../models/video-entity';
import { docClient, getAnimeKey, getVideoKey } from '../../shared/repository';

interface AnimeKey {
  myAnimeListId: number;
  dub: string;
}

const GET_OPERATION_LIMIT = 100;
const TABLE_PRIMARY_KEY = 'primaryKey';
const logger = createLogger('handlers/manual-resend-downloaded-notifications/repository');

export const getVideosByVideoKeys = async (videoKeys: VideoKey[]): Promise<VideoEntity[]> => {
  if (videoKeys.length === 0) {
    return [];
  }

  const keys = videoKeys.map(videoKey => ({ [TABLE_PRIMARY_KEY]: getVideoKey(videoKey) }));
  const chunks = splitToChunks(keys, GET_OPERATION_LIMIT);

  const videos: VideoEntity[] = [];
  for (const chunk of chunks) {
    const command = new BatchGetCommand({
      RequestItems: {
        [config.value.database.tableName]: {
          Keys: chunk,
        },
      },
    });

    const response = await docClient.send(command);
    const chunkVideos = response.Responses?.[config.value.database.tableName] as VideoEntity[] | undefined;
    logger.info('Videos found by video keys', { count: chunkVideos?.length ?? 0 });
    videos.push(...(chunkVideos ?? []));
  }

  return videos;
};

const getVideoKeysByAnimeKey = async (animeKey: AnimeKey): Promise<VideoKey[]> => {
  const response = await docClient.send(new QueryCommand({
    TableName: config.value.database.tableName,
    IndexName: config.value.database.animeKeyIndexName,
    KeyConditionExpression: 'animeKey = :animeKey',
    ExpressionAttributeValues: {
      ':animeKey': getAnimeKey(animeKey.myAnimeListId, animeKey.dub),
    },
  }));

  const videoKeys = response.Items as VideoKey[] | undefined;
  logger.info('Video keys found by anime key', { animeKey, count: videoKeys?.length ?? 0 });
  return videoKeys ?? [];
};

export const getVideosByAnimeKey = async (animeKey: AnimeKey): Promise<VideoEntity[]> => {
  return getVideosByVideoKeys(await getVideoKeysByAnimeKey(animeKey));
};