import type { Handler } from 'aws-lambda/handler';

import type { MatcherResponse } from '../../../../third-party/common/ts/interfaces';
import { createLogger } from '../shared/logger';


const logger = createLogger('handlers-mocks/get-series-to-match');

export const handler: Handler<undefined, MatcherResponse> = async () => {
  logger.info('Request', { request: undefined });
  throw new Error('Not implemented');
};