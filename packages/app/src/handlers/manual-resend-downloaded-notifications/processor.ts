import type { VideoDownloadedNotification, VideoKey } from '../../../../../third-party/common/ts/interfaces';
import type { VideoEntity } from '../../models/video-entity';
import { VideoStatusNum } from '../../models/video-status-num';
import { getVideosByAnimeKey, getVideosByVideoKeys } from './repository';


export interface AnimeKey {
  myAnimeListId: number;
  dub: string;
}

const getVideosForKey = async (key: VideoKey | AnimeKey): Promise<VideoEntity[]> => {
  return 'episode' in key
    ? getVideosByVideoKeys([key])
    : getVideosByAnimeKey(key);
};

const getDownloadedVideosOrThrow = async (keys: (VideoKey | AnimeKey)[]): Promise<VideoEntity[]> => {
  const videos: VideoEntity[] = [];

  for (const key of keys) {
    const videosForKey = await getVideosForKey(key);
    if (videosForKey.length === 0 || videosForKey.some(video => video.status !== VideoStatusNum.Downloaded)) {
      throw new Error('Requested key was not found as downloaded: ' + JSON.stringify(key));
    }

    videos.push(...videosForKey);
  }

  return Array.from(new Map(videos.map(video => [video.primaryKey, video])).values());
};

const makeNotification = (video: VideoEntity): VideoDownloadedNotification => ({
  videoKey: {
    myAnimeListId: video.myAnimeListId,
    dub: video.dub,
    episode: video.episode,
  },
  messageId: video.messageId,
  scenes: video.scenes,
  publishingDetails: video.publishingDetails,
});

export const collectNotificationsToSend = async (
  keys: (VideoKey | AnimeKey)[],
): Promise<VideoDownloadedNotification[]> => {
  const videos = await getDownloadedVideosOrThrow(keys);
  return videos.map(makeNotification);
}