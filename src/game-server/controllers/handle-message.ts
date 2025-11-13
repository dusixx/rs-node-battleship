import { JSONParse } from '../../common/utils/index';

export const handleMessage = (rawMessage: Buffer): void => {
  const message = JSONParse(rawMessage.toString('utf-8'));
  console.log(message);
};
