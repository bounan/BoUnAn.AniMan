import type { Handler } from 'aws-lambda/handler';

import type { DownloaderResponse } from '../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../third-party/common/ts/runtime/logger';


const logger = createLogger('handlers-mocks/get-video-to-download');

export const handler: Handler<undefined, DownloaderResponse> = async () => {
  logger.info('Request', { request: undefined });
  throw new Error('Not implemented');
};