import type { Handler } from 'aws-lambda/handler';

import type { PublisherResultRequest } from '../../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { savePublishingDetails } from './repository';

const logger = createLogger('handlers/update-publishing-details');


const process = async (request: PublisherResultRequest): Promise<void> => {
  for (const item of request.items) {
    await savePublishingDetails(item.videoKey, item.publishingDetails);
  }

  logger.info('Publishing details saved');
};

export const handler: Handler<PublisherResultRequest, void> = async (request) => {
  logger.info('Request', { request });
  await initConfig();

  return retry(async () => await process(request), 3);
};