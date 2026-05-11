import type { Handler } from 'aws-lambda/handler';

import type { DownloaderResultRequest } from '../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../third-party/common/ts/runtime/logger';


const logger = createLogger('handlers-mocks/update-video-status');

export const handler: Handler<DownloaderResultRequest, void> = async (request) => {
  logger.info('Request', { request });
  throw new Error('Not implemented');
};