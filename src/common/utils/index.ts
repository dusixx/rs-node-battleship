export * from './misc';
export * from './request';
export * from './response';
export * from './start-servers';
export * from './style';

import { config } from 'dotenv';
import { DEF_PORT } from '../constants';

config({ quiet: true });

const { PORT: _PORT } = process.env;
export const PORT = Number(_PORT) || DEF_PORT;
