import type { Handler } from 'aws-lambda/handler';

import type { BotRequest, BotResponse } from '../../../../../third-party/common/ts/interfaces';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { getEpisodes } from '../../api-clients/loan-api-client';
import { initConfig } from '../../config/config';
import { VideoStatusNum } from '../../models/video-status-num';
import { videoStatusToStr } from '../../shared/helpers/video-status-to-str';
import { increasePriority, insertVideo } from '../../shared/repository';
import { getAnimeForUser, getRegisteredEpisodes } from './repository';
import { sendVideoRegisteredNotification } from './sns-client';

const addAnime = async ({ videoKey }: BotRequest): Promise<VideoStatusNum> => {
  const dubEpisodes = await getEpisodes(videoKey.myAnimeListId, videoKey.dub);
  if (dubEpisodes.length === 0) {
    console.warn('Video not available: ' + JSON.stringify(videoKey));
    return VideoStatusNum.NotAvailable;
  }

  const registeredEpisodes = await getRegisteredEpisodes(videoKey.myAnimeListId, videoKey.dub);
  const episodesToRegister = dubEpisodes.filter(episode => !registeredEpisodes.includes(episode));

  const videosToRegister = episodesToRegister.map(episode => ({ ...videoKey, episode }));
  console.log('Videos to register: ' + JSON.stringify(videosToRegister));

  await insertVideo(videosToRegister);
  console.log('Video added to database');

  await increasePriority(videoKey);
  console.log('Priority increased for requested video');

  await sendVideoRegisteredNotification(videosToRegister);
  console.log('Video registered notification sent: ' + JSON.stringify(videosToRegister));

  return VideoStatusNum.Pending;
}

const process = async (request: BotRequest): Promise<BotResponse> => {
  const video = await getAnimeForUser(request.videoKey);
  console.log('Video: ' + JSON.stringify(video));

  switch (video?.status) {
    case VideoStatusNum.Downloaded:
    case VideoStatusNum.Failed: {
      const response = {
        status: videoStatusToStr(video.status),
        messageId: video.messageId,
        scenes: video.scenes,
        publishingDetails: video.publishingDetails,
      };
      console.log('Returning video as is: ' + JSON.stringify(response));
      return response;
    }

    case VideoStatusNum.Pending:
    case VideoStatusNum.Downloading: {
      console.log('Returning video as pending or downloading');
      await increasePriority(request.videoKey);
      return {
        status: videoStatusToStr(video.status),
        messageId: undefined,
        scenes: undefined,
        publishingDetails: undefined,
      };
    }

    case undefined: {
      console.log('Adding anime');
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

  return retry(async () => await process(request), 3, () => true);
};