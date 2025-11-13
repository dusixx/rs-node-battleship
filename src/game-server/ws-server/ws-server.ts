import { config } from 'dotenv';
import { showError } from '../../common/utils';
import { startWebsocketServer } from '../../common/utils/start-server';
import { cyan } from '../../common/utils/style';
import { handleMessage } from '../controllers/handle-message';

config({ quiet: true });

const { WS_PORT } = process.env;
const port = Number(WS_PORT) || 3000;

void startWebsocketServer({ port })
  .then(wss => {
    console.log(cyan(`\n🚀 WebSocket server running on ws://localhost:${port}\n`));

    wss.on('connection', ws => {
      console.log('Client connected');
      ws.on('message', handleMessage);
      ws.send('test');
      ws.on('close', () => {
        console.log('Client disconnected');
      });
    });
  })
  .catch(showError);
