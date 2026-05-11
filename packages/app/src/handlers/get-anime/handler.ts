import type { Handler } from 'aws-lambda/handler';

import type { BotRequest, BotResponse, VideoKey } from '../../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { getEpisodes } from '../../api-clients/loan-api-client';
import { initConfig } from '../../config/config';
import { VideoStatusNum } from '../../models/video-status-num';
import { videoStatusToStr } from '../../shared/helpers/video-status-to-str';
import { increasePriority, insertVideo } from '../../shared/repository';
import { getAnimeForUser, getRegisteredEpisodes } from './repository';
import { sendVideoRegisteredNotification } from './sns-client';

const logger = createLogger('handlers/get-anime');

type ProcessResult = {
  responseForBot: BotResponse;
  registeredVideosForNotification: VideoKey[];
};

const validateRequest = (request: BotRequest): void => {
  if (!request.videoKey.myAnimeListId
    || !request.videoKey.dub
    || request.videoKey.episode === null) {
    throw new Error('Invalid request: ' + JSON.stringify(request));
  }
};

const addAnime = async ({ videoKey }: BotRequest): Promise<{
  status: VideoStatusNum;
  registeredVideos: VideoKey[]
}> => {
  const dubEpisodes = await getEpisodes(videoKey.myAnimeListId, videoKey.dub);
  if (dubEpisodes.length === 0) {
    logger.warn('Video not available', { videoKey });
    return { status: VideoStatusNum.NotAvailable, registeredVideos: [] };
  }

  const registeredEpisodes = await getRegisteredEpisodes(videoKey.myAnimeListId, videoKey.dub);
  const episodesToRegister = dubEpisodes.filter(episode => !registeredEpisodes.includes(episode));

  const videosToRegister = episodesToRegister.map(episode => ({ ...videoKey, episode }));
  logger.info('Videos to register', { videosToRegister });

  await insertVideo(videosToRegister);
  logger.info('Video added to database');

  await increasePriority(videoKey);
  logger.info('Priority increased for requested video');

  return { status: VideoStatusNum.Pending, registeredVideos: videosToRegister };
};

const process = async (request: BotRequest): Promise<ProcessResult> => {
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
      return { responseForBot: response, registeredVideosForNotification: [] };
    }

    case VideoStatusNum.Pending:
    case VideoStatusNum.Downloading: {
      logger.info('Returning video as pending or downloading');
      await increasePriority(request.videoKey);
      return {
        responseForBot: {
          status: videoStatusToStr(video.status),
          messageId: undefined,
          scenes: undefined,
          publishingDetails: undefined,
        },
        registeredVideosForNotification: [],
      };
    }

    case undefined: {
      logger.info('Adding anime');
      const addAnimeResult = await addAnime(request);
      return {
        responseForBot: {
          status: videoStatusToStr(addAnimeResult.status),
          messageId: undefined,
          scenes: undefined,
          publishingDetails: undefined,
        },
        registeredVideosForNotification: addAnimeResult.registeredVideos,
      };
    }

    default:
      throw new RangeError('Incorrect status');
  }
};

const notify = async (result: ProcessResult): Promise<void> => {
  if (result.registeredVideosForNotification.length === 0) {
    logger.info('No videos registered, skipping notification');
    return;
  }

  await sendVideoRegisteredNotification(result.registeredVideosForNotification);
  logger.info('Video registered notification sent', { videosToRegister: result.registeredVideosForNotification });
};

export const handler: Handler<BotRequest, BotResponse> = async (request) => {
  logger.info('Request', { request });
  validateRequest(request);
  await initConfig();

  return retry(async () => {
    const result = await process(request);
    await notify(result);
    return result.responseForBot;
  }, 3);
};