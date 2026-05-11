import type { Handler } from 'aws-lambda/handler';

import type { DownloaderResultRequest } from '../../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import type { VideoEntity } from '../../models/video-entity';
import { markVideoDownloaded, markVideoFailed } from './repository';
import { sendVideoDownloadedNotification } from './sns-client';

const logger = createLogger('handlers/update-video-status');

const process = async (request: DownloaderResultRequest): Promise<VideoEntity> => {
  if (request.messageId) {
    logger.info('Video downloaded');
    return markVideoDownloaded(request.videoKey, request.messageId);
  } else {
    logger.warn('Video download failed');
    return markVideoFailed(request.videoKey);
  }
};

const notify = async (request: DownloaderResultRequest, videoEntity: VideoEntity): Promise<void> => {
  const notification = {
    videoKey: request.videoKey,
    messageId: request.messageId,
    scenes: videoEntity.scenes,
    publishingDetails: videoEntity.publishingDetails,
  };

  await sendVideoDownloadedNotification(notification);
  logger.info('Video downloaded notification sent');
};

export const handler: Handler<DownloaderResultRequest, void> = async (request) => {
  logger.info('Request', { request });
  await initConfig();

  return retry(async () => {
    const videoEntity = await process(request);
    await notify(request, videoEntity);
  }, 3);
};