import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { assert } from '../../../third-party/common/ts/runtime/assert';
import type { VideoEntity } from '../../app/src/models/video-entity';

export class DynamoDbTableFixture {
  private readonly client: DynamoDBDocumentClient;

  private constructor(public readonly tableName: string) {
    const dynamoDbClient = new DynamoDBClient({
      endpoint: 'http://localhost:8001',
      region: 'us-east-1',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    });
    this.client = DynamoDBDocumentClient.from(dynamoDbClient);
  }

  static async create(tableName: string): Promise<DynamoDbTableFixture> {
    assert(tableName.includes('test-table-'));
    const fixture = new DynamoDbTableFixture(tableName);
    await fixture.createTable();
    return fixture;
  }

  async getAllRecords(): Promise<VideoEntity[]> {
    const result = await this.client.send(new ScanCommand({ TableName: this.tableName }));
    return ((result.Items ?? []) as VideoEntity[]).sort((a, b) => a.primaryKey.localeCompare(b.primaryKey));
  }

  async putRecords(...records: Record<string, unknown>[]): Promise<void> {
    for (const record of records) {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: record,
      }));
    }
  }

  async dropTable(): Promise<void> {
    assert(this.tableName.includes('test-table-'));
    await this.client.send(new DeleteTableCommand({ TableName: this.tableName }));
  }

  private async createTable(): Promise<void> {
    const command = new CreateTableCommand({
      TableName: this.tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'primaryKey', AttributeType: 'S' },
        { AttributeName: 'animeKey', AttributeType: 'S' },
        { AttributeName: 'episode', AttributeType: 'N' },
        { AttributeName: 'status', AttributeType: 'N' },
        { AttributeName: 'sortKey', AttributeType: 'S' },
        { AttributeName: 'matchingStatus', AttributeType: 'N' },
        { AttributeName: 'matchingGroup', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'primaryKey', KeyType: 'HASH' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'AnimeKey-Episode-index_2',
          KeySchema: [
            { AttributeName: 'animeKey', KeyType: 'HASH' },
            { AttributeName: 'episode', KeyType: 'RANGE' },
          ],
          Projection: {
            ProjectionType: 'INCLUDE',
            NonKeyAttributes: ['myAnimeListId', 'dub', 'episode'],
          },
        },
        {
          IndexName: 'Status-SortKey-index_2',
          KeySchema: [
            { AttributeName: 'status', KeyType: 'HASH' },
            { AttributeName: 'sortKey', KeyType: 'RANGE' },
          ],
          Projection: {
            ProjectionType: 'INCLUDE',
            NonKeyAttributes: ['myAnimeListId', 'dub', 'episode', 'updatedAt', 'downloadPerformedAttempts'],
          },
        },
        {
          IndexName: 'Matcher-CreatedAt-index_3',
          KeySchema: [
            { AttributeName: 'matchingStatus', KeyType: 'HASH' },
            { AttributeName: 'matchingGroup', KeyType: 'RANGE' },
          ],
          Projection: {
            ProjectionType: 'INCLUDE',
            NonKeyAttributes: ['myAnimeListId', 'dub', 'episode', 'updatedAt', 'matchingPerformedAttempts'],
          },
        },
      ],
    });

    await this.client.send(command);
    await waitUntilTableExists({ client: this.client, maxWaitTime: 30 }, { TableName: this.tableName });
  }
}
