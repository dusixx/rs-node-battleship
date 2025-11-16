import { config } from 'dotenv';
import { startWebsocketServer } from '../../common/utils/start-server';
import { cyan } from '../../common/utils/style';
import { DEF_WS_PORT } from '../common/data/constants';
import { SessionManager } from '../session-manager/session-manager';

config({ quiet: true });

const NORMAL_WS_CLOSURE = 1001;

const { WS_PORT } = process.env;
const port = Number(WS_PORT) || DEF_WS_PORT;

void startWebsocketServer({ port }).then(wss => {
  console.clear();
  console.log(cyan(`\n🚀 WebSocket server running on ws://localhost:${port}`));

  SessionManager.getInstance(wss);

  const cleanUp = (): void => {
    console.log('\nClosing connections...');

    wss.close(() => {
      wss.clients.forEach(client => {
        client.close(NORMAL_WS_CLOSURE);
      });
      process.exit(0);
    });
  };
  process.on('SIGTERM', cleanUp);
  process.on('SIGINT', cleanUp);
});
