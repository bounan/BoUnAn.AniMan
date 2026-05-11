import type { VideoKey, VideoRegisteredNotification } from '../../../../../third-party/common/ts/interfaces';
import { config } from '../../config/config';
import { publishJsonMessage } from '../../shared/sns-publisher';

export const sendVideoRegisteredNotification = async (items: VideoKey[]): Promise<void> => {
  const obj: VideoRegisteredNotification = {
    items: items.map(item => ({ videoKey: item })),
  };

  await publishJsonMessage<VideoRegisteredNotification>(config.value.topics.videoRegisteredTopicArn, obj);
};
