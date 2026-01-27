import { Handler } from 'aws-lambda/handler';

import { MatcherResponse } from '../../../../third-party/common/ts/interfaces';


export const handler: Handler<undefined, MatcherResponse> = async () => {
    throw new Error('Not implemented');
};