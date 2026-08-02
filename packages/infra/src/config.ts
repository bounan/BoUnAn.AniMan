import { ExportNames } from '../../../third-party/common/ts/cdk/export-names';
import { getCfnValue } from '../../../third-party/common/ts/cdk/helpers';
import configFile from './configuration.json';

export interface Config {
  alertEmail: string;
}

export const getConfig = (prefix: string): Config => ({
  alertEmail: getCfnValue('alertEmail', prefix, ExportNames.AlertEmail, configFile),
});
