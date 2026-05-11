/* eslint @typescript-eslint/no-explicit-any: 0 */

import { createLogger } from '../../../third-party/common/ts/runtime/logger';
import { handler as getAnime } from './handlers/get-anime/handler';
import { handler as getSeriesToMatch } from './handlers/get-series-to-match/handler';
import { handler as getVideoToDownload } from './handlers/get-video-to-download/handler';
import { handler as updateVideoScenes } from './handlers/update-video-scenes/handler';
import { handler as updateVideoStatus } from './handlers/update-video-status/handler';

const logger = createLogger('local-runner');

const main = async () => {
  const myAnimeListId = 37105;
  const dub = 'AniLibria.TV';
  const episode = 2;

  const s1 = await getAnime({
    videoKey: {
      myAnimeListId: myAnimeListId,
      dub: dub,
      episode: episode,
    },
  }, null as any, null as any);
  logger.info('getAnime result', { result: s1 });

  const s2 = await getSeriesToMatch(null as any, null as any, null as any);
  logger.info('getSeriesToMatch result', { result: s2 });

  const s3 = await getVideoToDownload(null as any, null as any, null as any);
  logger.info('getVideoToDownload result', { result: s3 });

  const s4 = await updateVideoScenes({
    items: [
      {
        videoKey: {
          myAnimeListId: myAnimeListId,
          dub: dub,
          episode: episode,
        },
        scenes: {
          opening: {
            start: 0,
            end: 10,
          },
          ending: {
            start: 0,
            end: 10,
          },
        },
      },
      {
        videoKey: {
          myAnimeListId: myAnimeListId,
          dub: dub,
          episode: episode + 1,
        },
        scenes: {},
      },
      {
        videoKey: {
          myAnimeListId: myAnimeListId,
          dub: dub,
          episode: episode + 2,
        },
      },
    ],
  }, null as any, null as any);
  logger.info('updateVideoScenes result', { result: s4 });

  const s5 = await updateVideoStatus({
    videoKey: {
      myAnimeListId: myAnimeListId,
      dub: dub,
      episode: episode,
    },
    messageId: 1,
  }, null as any, null as any);
  logger.info('updateVideoStatus result', { result: s5 });

  const s6 = await getAnime({
    videoKey: {
      myAnimeListId: myAnimeListId,
      dub: dub,
      episode: 7,
    },
  }, null as any, null as any);
  logger.info('getAnime result', { result: s6 });

}

main();
