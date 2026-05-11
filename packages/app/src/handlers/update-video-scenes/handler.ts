import type { Handler } from 'aws-lambda/handler';

import type { MatcherResultRequest } from '../../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { updateVideoScenes } from './repository';
import { sendSceneRecognizedNotification } from './sns-client';

const logger = createLogger('handlers/update-video-scenes');

const process = async (request: MatcherResultRequest): Promise<void> => {
  await updateVideoScenes(request);
  logger.info('Video scenes updated');
};

const notify = async (request: MatcherResultRequest): Promise<void> => {
  await sendSceneRecognizedNotification(request.items);
  logger.info('Video recognized notification sent');
};

export const handler: Handler<MatcherResultRequest, void> = async (request) => {
  logger.info('Request', { request });
  await initConfig();

  return retry(async () => {
    await process(request);
    await notify(request);
  }, 3);
};