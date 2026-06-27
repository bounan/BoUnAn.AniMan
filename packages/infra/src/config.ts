import type { Stack } from 'aws-cdk-lib';

import { getSsmValue } from '../../../third-party/common/ts/cdk/helpers';
import configFile from './configuration.json';

export interface Config {
  alertEmail: string;
  loanApiFunctionArn: string;
  maxDownloadFailedAttempts: number;
  downloadRetryDelayMs: number;
  maxMatchingFailedAttempts: number;
  matchingRetryDelayMs: number;
}

export const getConfig = (stack: Stack, prefix: string): Config => ({
  alertEmail: getSsmValue(stack, prefix, 'alertEmail', configFile),
  loanApiFunctionArn: getSsmValue(stack, prefix, 'loanApiFunctionArn', configFile),
  maxDownloadFailedAttempts: Number(getSsmValue(stack, prefix, 'maxDownloadFailedAttempts', configFile)),
  downloadRetryDelayMs: Number(getSsmValue(stack, prefix, 'downloadRetryDelayMs', configFile)),
  maxMatchingFailedAttempts: Number(getSsmValue(stack, prefix, 'maxMatchingFailedAttempts', configFile)),
  matchingRetryDelayMs: Number(getSsmValue(stack, prefix, 'matchingRetryDelayMs', configFile)),
});