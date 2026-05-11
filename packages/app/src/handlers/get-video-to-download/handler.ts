import type { Handler } from 'aws-lambda/handler';

import type { DownloaderResponse } from '../../../../../third-party/common/ts/interfaces';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { getEpisodeToDownloadAndLock } from './repository';

const logger = createLogger('handlers/get-video-to-download');


const process = async (): Promise<DownloaderResponse> => {
  const videoToDownload = await getEpisodeToDownloadAndLock();
  logger.info('Video to download', { videoToDownload });

  return { videoKey: videoToDownload };
}

export const handler: Handler<undefined, DownloaderResponse> = async () => {
  await initConfig();
  return retry(async () => await process(), 3);
};