/* eslint-disable @typescript-eslint/no-misused-promises */
import type { RequestListener, Server } from 'http';
import { exec } from 'node:child_process';
import http from 'node:http';
import { promisify } from 'node:util';
import { WebSocketServer } from 'ws';
import { DEF_HOSTNAME } from '../../game-server/common/constants';

const execAsync = promisify(exec);

const tryKillTask = async (pid: string | number): Promise<void> => {
  try {
    await execAsync(`taskkill /f /pid ${pid}`);
  } catch {
    void 0;
  }
};

export const killServer = async (port: number): Promise<void> => {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const matches = stdout.match(/\d+$/gm) ?? [];
      const pids = [...new Set(matches)].map(Number).filter(Boolean);

      for (const pid of pids) {
        await tryKillTask(pid);
      }
    } else {
      await execAsync(`lsof -ti:${port} | xargs kill -9`);
    }
  } catch {
    void 0;
  }
};

type StartServerProps = {
  port: number;
  hostname?: string;
  killExists?: boolean;
  connectionTimeout?: number;
  retryDelay?: number;
};

const ERR_TIME_IS_UP = 'time is up';
const MSG_ADDRR_IN_USE = '⏳ Address in use, retrying...';

const DefaultOptions = {
  connectionTimeout: 10_000,
  retryDelay: 1000,
  hostname: DEF_HOSTNAME,
  killExists: true,
} as const;

export const startWebsocketServer = async (props: StartServerProps): Promise<WebSocketServer> => {
  const { port, connectionTimeout, retryDelay, killExists, hostname } = {
    ...DefaultOptions,
    ...props,
  };
  let elapsed = 0;
  const wss = new WebSocketServer({ port, host: hostname });

  return await new Promise((resolve, reject) => {
    wss.on('listening', () => {
      resolve(wss);
    });
    if (killExists) {
      wss.on('error', async (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.log(MSG_ADDRR_IN_USE);
          await killServer(port);

          setTimeout(async () => {
            wss.close();

            elapsed += retryDelay;
            if (elapsed >= connectionTimeout) {
              reject(Error(ERR_TIME_IS_UP));
            }
            resolve(await startWebsocketServer(props));
          }, retryDelay);
        }
      });
    } else {
      wss.on('error', reject);
    }
  });
};

export const startHttpServer = async (
  props: StartServerProps,
  requestListener?: RequestListener,
): Promise<Server> => {
  const { port, connectionTimeout, retryDelay, killExists, hostname } = {
    ...DefaultOptions,
    ...props,
  };
  let elapsed = 0;
  const server = http.createServer(requestListener);

  return await new Promise((resolve, reject) => {
    if (killExists) {
      server.on('error', async (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.log(MSG_ADDRR_IN_USE);

          await killServer(port);

          setTimeout(() => {
            server.close();

            elapsed += retryDelay;
            if (elapsed >= connectionTimeout) {
              reject(Error(ERR_TIME_IS_UP));
            }
            server.listen(port, hostname);
          }, retryDelay);
        }
      });
    } else {
      server.on('error', reject);
    }
    server.on('listening', () => {
      resolve(server);
    });
    server.listen(port, hostname);
  });
};
