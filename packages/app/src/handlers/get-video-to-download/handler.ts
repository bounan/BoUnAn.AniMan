import type { Handler } from 'aws-lambda/handler';

import type { DownloaderResponse } from '../../../../../third-party/common/ts/interfaces';
import { retry } from '../../../../../third-party/common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { getEpisodeToDownloadAndLock } from './repository';


const process = async (): Promise<DownloaderResponse> => {
  const videoToDownload = await getEpisodeToDownloadAndLock();
  console.log('Video to download: ' + JSON.stringify(videoToDownload));

  return { videoKey: videoToDownload };
}

export const handler: Handler<undefined, DownloaderResponse> = async () => {
  await initConfig();
  return retry(async () => await process(), 3, () => true);
};