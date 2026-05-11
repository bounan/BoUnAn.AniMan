import type { VideoDownloadedNotification } from '../../../../../third-party/common/ts/interfaces';
import { config } from '../../config/config';
import { publishJsonMessage } from '../../shared/sns-publisher';

export const sendVideoDownloadedNotification = async (notification: VideoDownloadedNotification): Promise<void> => {
  await publishJsonMessage<VideoDownloadedNotification>(config.value.topics.videoDownloadedTopicArn, notification);
};
