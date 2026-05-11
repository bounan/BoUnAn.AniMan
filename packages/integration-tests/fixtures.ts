import { test as baseTest } from 'vitest';

import { cache } from '../../third-party/common/ts/runtime/memorized';
import type { Config } from '../app/src/config/config';
import { AwsInterceptor } from './tools/aws-interceptor';
import { DynamoDbTableFixture } from './tools/dynamodb';

const INDEXES = {
  animeKeyIndexName: 'AnimeKey-Episode-index_2',
  secondaryIndexName: 'Status-SortKey-index_2',
  matcherSecondaryIndexName: 'Matcher-CreatedAt-index_3',
} as const;

export const it = baseTest
  .extend('global-envs', { scope: 'worker', auto: true }, async () => {
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ENDPOINT_URL_DYNAMODB = 'http://localhost:8001';
  })
  .extend('aws', { scope: 'test', auto: true }, async ({ task }, { onCleanup }) => {
    void task;
    const aws = AwsInterceptor.create();
    onCleanup(() => aws[Symbol.dispose]());
    return aws;
  })
  .extend('memoized-cache', { scope: 'test', auto: true }, async ({ task }, { onCleanup }) => {
    void task;
    cache.clear();
    onCleanup(() => cache.clear());
  })
  .extend('table', { scope: 'test', auto: true }, async ({ task }, { onCleanup }) => {
    const tableName = `test-table-${task.id}-${Date.now()}`;
    const fixture = await DynamoDbTableFixture.create(tableName);
    onCleanup(() => fixture.dropTable());
    return fixture;
  })
  .extend('config', { scope: 'test', auto: true }, async ({ task, table }) => {
    return {
      loanApiConfig: { functionArn: `loan-api-function-${task.id}` },
      database: {
        tableName: table.tableName,
        ...INDEXES,
      },
      topics: {
        videoRegisteredTopicArn: `video-registered-${task.id}`,
        videoDownloadedTopicArn: `video-downloaded-${task.id}`,
        sceneRecognisedTopicArn: `scene-recognised-${task.id}`,
      },
      downloadRetry: {
        maxAttempts: 5,
        retryDelayMs: 60 * 60 * 1000,
      },
      matchingRetry: {
        maxAttempts: 5,
        retryDelayMs: 60 * 60 * 1000,
      },
    } satisfies Config;
  })
  .extend('ssmConfig', { scope: 'test', auto: true }, async ({ aws, config }) => {
    aws.mockSsm('/bounan/animan/runtime-config', config);
  });
