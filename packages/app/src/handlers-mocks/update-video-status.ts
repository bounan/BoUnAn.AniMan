import type { Handler } from 'aws-lambda/handler';

import type { DownloaderResultRequest } from '../../../../third-party/common/ts/interfaces';


export const handler: Handler<DownloaderResultRequest, void> = async (request) => {
  console.log(request);
  throw new Error('Not implemented');
};