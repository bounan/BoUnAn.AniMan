import type { Stack } from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import configFile from './configuration.json';

const rawConfig = configFile as Partial<Record<keyof Config, string | number>>;

export interface Config {
  alertEmail: string;
  loanApiFunctionArn: string;
  maxDownloadFailedAttempts: number;
  downloadRetryDelayMs: number;
}

const getValue = (stack: Stack, prefix: string, key: keyof Config): string => {
  const configuredValue = rawConfig[key];
  return configuredValue !== undefined && configuredValue !== ''
    ? String(configuredValue)
    : ssm.StringParameter.valueForStringParameter(stack, `${prefix}/${key}`);
}

const getNumberValue = (stack: Stack, prefix: string, key: keyof Config): number => {
  return Number(getValue(stack, prefix, key));
};

export const getConfig = (stack: Stack, prefix: string): Config => ({
  alertEmail: getValue(stack, prefix, 'alertEmail'),
  loanApiFunctionArn: getValue(stack, prefix, 'loanApiFunctionArn'),
  maxDownloadFailedAttempts: getNumberValue(stack, prefix, 'maxDownloadFailedAttempts'),
  downloadRetryDelayMs: getNumberValue(stack, prefix, 'downloadRetryDelayMs'),
});