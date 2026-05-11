import type { Handler } from 'aws-lambda/handler';

import type { MatcherResultRequest } from '../../../../../third-party/common/ts/interfaces';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { createLogger } from '../../shared/logger';
import { updateVideoScenes } from './repository';
import { sendSceneRecognizedNotification } from './sns-client';

const logger = createLogger('handlers/update-video-scenes');


const process = async (request: MatcherResultRequest): Promise<void> => {
  await updateVideoScenes(request);
  logger.info('Video scenes updated');

  await sendSceneRecognizedNotification(request.items);
  logger.info('Video recognized notification sent');
}

export const handler: Handler<MatcherResultRequest, void> = async (request) => {
  await initConfig();
  return retry(async () => await process(request), 3);
};