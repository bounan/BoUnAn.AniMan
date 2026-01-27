import type { Handler } from 'aws-lambda/handler';

import type { DownloaderResponse } from '../../../../third-party/common/ts/interfaces';


export const handler: Handler<undefined, DownloaderResponse> = async () => {
  throw new Error('Not implemented');
};