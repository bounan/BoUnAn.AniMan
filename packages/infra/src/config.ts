import type { Stack } from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import configFile from './configuration.json';

export interface Config {
  alertEmail: string;
  loanApiFunctionArn: string;
}

const getValue = (stack: Stack, prefix: string, key: keyof Config): string => {
  return configFile[key] || ssm.StringParameter.valueForStringParameter(stack, `${prefix}/${key}`);
}

export const getConfig = (stack: Stack, prefix: string): Config => ({
  alertEmail: getValue(stack, prefix, 'alertEmail'),
  loanApiFunctionArn: getValue(stack, prefix, 'loanApiFunctionArn'),
});