import { fetchSsmValue } from '../../../../third-party/common/ts/runtime/ssm-client';


interface LoanApiConfig {
  functionArn: string;
}

interface DatabaseConfig {
  tableName: string;
  animeKeyIndexName: string;
  secondaryIndexName: string;
  matcherSecondaryIndexName: string;
}

interface Topics {
  videoRegisteredTopicArn: string;
  videoDownloadedTopicArn: string;
  sceneRecognisedTopicArn: string;
}

interface RetryConfig {
  maxAttempts: number;
  retryDelayMs: number;
}

export interface Config {
  loanApiConfig: LoanApiConfig;
  database: DatabaseConfig;
  topics: Topics;
  downloadRetry: RetryConfig;
  matchingRetry: RetryConfig;
}

let cachedConfig: Config | undefined;

export const initConfig = async (): Promise<void> => {
  cachedConfig = await fetchSsmValue('/bounan/animan/runtime-config') as Config;
}

export const config = {
  get value() {
    if (!cachedConfig) {
      throw new Error('Config not initialized');
    }

    return cachedConfig;
  },
}