import type { Handler } from 'aws-lambda/handler';

import type { RegisterVideosRequest } from '../../../../third-party/common/ts/interfaces';


export const handler: Handler<RegisterVideosRequest> = async (request) => {
  console.log(request);
  throw new Error('Not implemented');
};