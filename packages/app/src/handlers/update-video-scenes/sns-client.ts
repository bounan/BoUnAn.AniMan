import type {
  SceneRecognisedNotification,
  SceneRecognisedNotificationItem,
} from '../../../../../third-party/common/ts/interfaces';
import { config } from '../../config/config';
import { publishJsonMessage } from '../../shared/sns-publisher';

export const sendSceneRecognizedNotification = async (items: SceneRecognisedNotificationItem[]): Promise<void> => {
  await publishJsonMessage<SceneRecognisedNotification>(config.value.topics.sceneRecognisedTopicArn, { items });
};
