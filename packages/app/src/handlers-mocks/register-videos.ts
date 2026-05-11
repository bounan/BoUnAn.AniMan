import type { Handler } from 'aws-lambda/handler';

import type { RegisterVideosRequest } from '../../../../third-party/common/ts/interfaces';
import { createLogger } from '../shared/logger';


const logger = createLogger('handlers-mocks/register-videos');

export const handler: Handler<RegisterVideosRequest> = async (request) => {
  logger.info('Request', { request });
  throw new Error('Not implemented');
};