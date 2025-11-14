import { showError } from './common/utils';

void (async (): Promise<void> => {
  try {
    await import('./game-server/ws-server/ws-server');
    await import('./http-server/index');
  } catch (err) {
    showError(err);
  }
})();
