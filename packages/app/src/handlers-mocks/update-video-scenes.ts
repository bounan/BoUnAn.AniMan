import type { Handler } from 'aws-lambda/handler';

import type { MatcherResultRequest } from '../../../../third-party/common/ts/interfaces';
import { createLogger } from '../shared/logger';


const logger = createLogger('handlers-mocks/update-video-scenes');

export const handler: Handler<MatcherResultRequest, void> = async (request) => {
  logger.info('Request', { request });
  throw new Error('Not implemented');
};