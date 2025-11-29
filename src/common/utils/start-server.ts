import * as net from 'net';
import { exec } from 'node:child_process';
import type { RequestListener } from 'node:http';
import http from 'node:http';
import { promisify } from 'node:util';
import { WebSocketServer } from 'ws';
import { sleep } from '.';

const execAsync = promisify(exec);

async function isPortAvailable(port: number | string): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

const tryKillTask = async (pid: string | number): Promise<void> => {
  try {
    await execAsync(`taskkill /f /pid ${pid}`);
  } catch {
    void 0;
  }
};

const tryKillServer = async (port: number | string): Promise<void> => {
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

type TryFreePortProps = {
  port: number | string;
  attempts?: number;
  delay?: number;
  quiet?: boolean;
};

class TimeoutError extends Error {}

const tryFreePort = async ({
  port,
  attempts = 5,
  delay = 1500,
  quiet,
}: TryFreePortProps): Promise<void> => {
  let curAttempt = 0;

  while (!(await isPortAvailable(port))) {
    if (!quiet) {
      console.log(`Address in use, retrying (${curAttempt + 1}/${attempts})...`);
    }
    await tryKillServer(port);
    await sleep(delay);

    if ((curAttempt += 1) >= attempts) {
      throw new TimeoutError('time is up');
    }
  }
};

export const startServers = async (
  port: number,
  requestListener?: RequestListener,
): Promise<WebSocketServer> => {
  await tryFreePort({ port });

  const server = http.createServer(requestListener);
  const wss = new WebSocketServer({ server });

  return await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.on('listening', () => {
      resolve(wss);
    });
    wss.on('error', reject);
    server.listen(port);
  });
};
