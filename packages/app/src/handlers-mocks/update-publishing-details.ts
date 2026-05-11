import type { Handler } from 'aws-lambda/handler';

import type { PublisherResultRequest } from '../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../third-party/common/ts/runtime/logger';


const logger = createLogger('handlers-mocks/update-publishing-details');

export const handler: Handler<PublisherResultRequest, void> = async (request) => {
  logger.info('Request', { request });
  throw new Error('Not implemented');
};