import { expect } from 'vitest';

import type { VideoEntity } from '../../app/src/models/video-entity';
import type { DynamoDbTableFixture } from './dynamodb';

export const performCommonChecks = async (table: DynamoDbTableFixture): Promise<void> => {
  const items = await table.getAllRecords();
  for (const item of items) {
    expect(item.createdAt).toBeDefined();
    expect(item.updatedAt).toBeDefined();
    expect(new Date(item.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect(new Date(item.updatedAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect(new Date(item.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(item.createdAt).getTime());
  }
};

export const expectNoDbChanges = async (initialState: VideoEntity[], table: DynamoDbTableFixture): Promise<void> => {
  const finalState = await table.getAllRecords();
  expect(finalState).toEqual(initialState);
};
