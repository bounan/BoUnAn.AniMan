import type { Handler } from 'aws-lambda/handler';

import type { PublisherResultRequest } from '../../../../third-party/common/ts/interfaces';


export const handler: Handler<PublisherResultRequest, void> = async (request) => {
  console.log(request);
  throw new Error('Not implemented');
};