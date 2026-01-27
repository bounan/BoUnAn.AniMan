import type { Handler } from 'aws-lambda/handler';

import type { MatcherResultRequest } from '../../../../third-party/common/ts/interfaces';


export const handler: Handler<MatcherResultRequest, void> = async (request) => {
  console.log(request);
  throw new Error('Not implemented');
};