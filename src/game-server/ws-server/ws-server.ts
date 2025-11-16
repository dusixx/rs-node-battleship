import { config } from 'dotenv';
import { startWebsocketServer } from '../../common/utils/start-server';
import { cyan } from '../../common/utils/style';
import { DEF_WS_PORT } from '../common/data/constants';
import { SessionManager } from '../session-manager/session-manager';

config({ quiet: true });

const { WS_PORT } = process.env;
const port = Number(WS_PORT) || DEF_WS_PORT;

void startWebsocketServer({ port }).then(wss => {
  console.clear();
  console.log(cyan(`\n🚀 WebSocket server running on ws://localhost:${port}`));

  SessionManager.getInstance(wss);
});
