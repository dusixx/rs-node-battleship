import { config } from 'dotenv';
import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { DEF_PORT } from './common/constants';
import { cyan, showError, startServers } from './common/utils';
import { SessionManager } from './session-manager/session-manager';

config({ quiet: true });

const { PORT } = process.env;
const port = Number(PORT) || DEF_PORT;

const requestListener = (req: IncomingMessage, res: ServerResponse): void => {
  const __dirname = path.resolve(path.dirname(''));
  const file_path =
    __dirname + (req.url === '/' ? '/front/index.html' : '/front' + (req.url ?? ''));
  fs.readFile(file_path, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
};

const start = async (): Promise<void> => {
  try {
    const wss = await startServers(port, requestListener);

    console.clear();
    console.log(cyan(`\n🚀 Servers running on {http|ws}://[::1]:${port}`));

    SessionManager.getInstance(wss);

    const cleanUp = (): void => {
      console.log('\nClosing connections...');
      wss.close();
      wss.clients.forEach(client => {
        client.terminate();
      });
      process.exit(0);
    };
    process.on('SIGTERM', cleanUp);
    process.on('SIGINT', cleanUp);
  } catch (err) {
    showError(err);
  }
};

void start();
