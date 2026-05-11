import type { Handler } from 'aws-lambda/handler';

import type { RegisterVideosRequest, VideoKey } from '../../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { insertVideo } from '../../shared/repository';
import { getExistingVideos } from './repository';
import { sendVideoRegisteredNotification } from './sns-client';

const logger = createLogger('handlers/register-videos');

const validateRequest = (request: RegisterVideosRequest): void => {
  if (!request || !request.items || request.items.length === 0
    || request.items.some(x =>
      !x.videoKey?.myAnimeListId
      || !x.videoKey?.dub
      || x.videoKey?.episode === undefined)) {
    throw new Error('Invalid request: ' + JSON.stringify(request));
  }
};

const process = async (request: RegisterVideosRequest): Promise<VideoKey[]> => {
  logger.info('Processing request', { request });

  const existingVideos = await getExistingVideos(request.items.map(x => x.videoKey));
  logger.info('Existing videos', { existingVideos });

  const videosToRegister = request.items
    .map(x => x.videoKey)
    .filter(x => !existingVideos
      .some(y => y.myAnimeListId === x.myAnimeListId && y.dub === x.dub && y.episode === x.episode));
  logger.info('Videos to register', { videosToRegister });
  if (videosToRegister.length === 0) {
    logger.info('No videos to register');
    return [];
  }

  await insertVideo(videosToRegister);
  logger.info('Videos added');

  return videosToRegister;
};

const notify = async (registeredVideos: VideoKey[]): Promise<void> => {
  if (registeredVideos.length === 0) {
    return;
  }

  await sendVideoRegisteredNotification(registeredVideos);
  logger.info('Notification sent');
};

export const handler: Handler<RegisterVideosRequest> = async (request) => {
  logger.info('Request', { request });
  validateRequest(request);
  await initConfig();

  return retry(async () => {
    const registeredVideos = await process(request);
    await notify(registeredVideos);
  }, 3);
};