import type { Handler } from 'aws-lambda/handler';

import type { BotRequest, BotResponse } from '../../../../../third-party/common/ts/interfaces';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { getEpisodes } from '../../api-clients/loan-api-client';
import { initConfig } from '../../config/config';
import { VideoStatusNum } from '../../models/video-status-num';
import { videoStatusToStr } from '../../shared/helpers/video-status-to-str';
import { createLogger } from '../../shared/logger';
import { increasePriority, insertVideo } from '../../shared/repository';
import { getAnimeForUser, getRegisteredEpisodes } from './repository';
import { sendVideoRegisteredNotification } from './sns-client';

const logger = createLogger('handlers/get-anime');

const addAnime = async ({ videoKey }: BotRequest): Promise<VideoStatusNum> => {
  const dubEpisodes = await getEpisodes(videoKey.myAnimeListId, videoKey.dub);
  if (dubEpisodes.length === 0) {
    logger.warn('Video not available', { videoKey });
    return VideoStatusNum.NotAvailable;
  }

  const registeredEpisodes = await getRegisteredEpisodes(videoKey.myAnimeListId, videoKey.dub);
  const episodesToRegister = dubEpisodes.filter(episode => !registeredEpisodes.includes(episode));

  const videosToRegister = episodesToRegister.map(episode => ({ ...videoKey, episode }));
  logger.info('Videos to register', { videosToRegister });

  await insertVideo(videosToRegister);
  logger.info('Video added to database');

  await increasePriority(videoKey);
  logger.info('Priority increased for requested video');

  await sendVideoRegisteredNotification(videosToRegister);
  logger.info('Video registered notification sent', { videosToRegister });

  return VideoStatusNum.Pending;
}

const process = async (request: BotRequest): Promise<BotResponse> => {
  const video = await getAnimeForUser(request.videoKey);
  logger.info('Video', { video });

  switch (video?.status) {
    case VideoStatusNum.Downloaded:
    case VideoStatusNum.Failed: {
      const response = {
        status: videoStatusToStr(video.status),
        messageId: video.messageId,
        scenes: video.scenes,
        publishingDetails: video.publishingDetails,
      };
      logger.info('Returning video as is', { response });
      return response;
    }

    case VideoStatusNum.Pending:
    case VideoStatusNum.Downloading: {
      logger.info('Returning video as pending or downloading');
      await increasePriority(request.videoKey);
      return {
        status: videoStatusToStr(video.status),
        messageId: undefined,
        scenes: undefined,
        publishingDetails: undefined,
      };
    }

    case undefined: {
      logger.info('Adding anime');
      const status = await addAnime(request);
      return {
        status: videoStatusToStr(status),
        messageId: undefined,
        scenes: undefined,
        publishingDetails: undefined,
      };
    }

    default:
      throw new RangeError('Incorrect status');
  }
}

export const handler: Handler<BotRequest, BotResponse> = async (request) => {
  await initConfig();

  if (!request.videoKey.myAnimeListId || !request.videoKey.dub || request.videoKey.episode === null) {
    throw new Error('Invalid request: ' + JSON.stringify(request));
  }

  return retry(async () => await process(request), 3);
};