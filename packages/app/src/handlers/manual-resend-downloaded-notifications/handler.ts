import type { Handler } from 'aws-lambda/handler';

import type { VideoKey } from '../../../../../third-party/common/ts/interfaces';
import { assert } from '../../../../../third-party/common/ts/runtime/assert';
import { createLogger } from '../../../../../third-party/common/ts/runtime/logger';
import { initConfig } from '../../config/config';
import { getVideoKey } from '../../shared/repository';
import { sendVideoDownloadedNotification } from '../update-video-status/sns-client';
import type { AnimeKey } from './processor';
import { collectNotificationsToSend } from './processor';

type RequestedKey = AnimeKey | VideoKey;

const logger = createLogger('handlers/manual-resend-downloaded-notifications');

const parseKey = (rawKey: string): RequestedKey => {
  const parts = rawKey.split('#');
  assert(parts.length === 2 || parts.length === 3);

  const myAnimeListId = Number(parts[0]);
  const dub = parts[1];
  assert(!!myAnimeListId && !!dub);

  if (parts.length === 2) {
    return { myAnimeListId, dub };
  }

  const episode = Number(parts[2]);
  assert(episode >= 0);
  return { myAnimeListId, dub, episode };
};

const validateAndParse = (request: string[]): RequestedKey[] => {
  assert(Array.isArray(request) && request.length > 0);

  const keys = request.map(parseKey);
  assert(keys.every(key => !!key));

  return keys as RequestedKey[];
};

export const handler: Handler<string[], void> = async (request) => {
  logger.info('Request', { request });
  const keys = validateAndParse(request);
  await initConfig();

  const notifications = await collectNotificationsToSend(keys);
  logger.info('Downloaded videos found', { count: notifications.length });

  for (const notification of notifications) {
    await sendVideoDownloadedNotification(notification);
    logger.info('Video downloaded notification resent', { videoKey: getVideoKey(notification.videoKey) });
  }

  logger.info('All notifications resent successfully', { count: notifications.length });
};
