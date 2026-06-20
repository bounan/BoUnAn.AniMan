import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { DynamoDbTableFixture } from '../tools/dynamodb';

describe('DynamoDB integration fixture', () => {
  it('stores and retrieves a record', async () => {
    const table = await DynamoDbTableFixture.create(`test-table-${randomUUID()}`);
    try {
      const record = { id: 'example', value: 'stored' };
      await table.put(record);
      await expect(table.getAll()).resolves.toEqual([record]);
    }
    finally {
      await table.drop();
    }
  });
});
