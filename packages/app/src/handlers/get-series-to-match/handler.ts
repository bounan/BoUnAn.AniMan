import type { Handler } from 'aws-lambda/handler';

import type { MatcherResponse } from '../../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { getEpisodesToMatch } from './repository';

const logger = createLogger('handlers/get-series-to-match');


const process = async (): Promise<MatcherResponse> => {
  const episodes = await getEpisodesToMatch();
  logger.info('Episodes to match', { episodes });

  return { videosToMatch: episodes };
}

export const handler: Handler<undefined, MatcherResponse> = async () => {
  await initConfig();
  return retry(async () => await process(), 3);
};