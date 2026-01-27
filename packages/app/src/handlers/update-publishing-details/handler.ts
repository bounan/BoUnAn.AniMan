import type { Handler } from 'aws-lambda/handler';

import type { PublisherResultRequest } from '../../../../../third-party/common/ts/interfaces';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { savePublishingDetails } from './repository';


const process = async (request: PublisherResultRequest): Promise<void> => {
  for (const item of request.items) {
    await savePublishingDetails(item.videoKey, item.publishingDetails);
  }

  console.log('Publishing details saved.');
}

export const handler: Handler<PublisherResultRequest, void> = async (request) => {
  await initConfig();
  console.log('Request: ' + JSON.stringify(request));
  return retry(async () => await process(request), 3, () => true);
};