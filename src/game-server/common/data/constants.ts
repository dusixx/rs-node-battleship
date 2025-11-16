export const BOT_ALIAS = '#bot';
export const BOT_ATTACK_DELAY = 250;
export const DEF_WS_PORT = 3000;

export const ErrorMessage = {
  InvalidCommandRequest: 'invalid command request format',
  PlayerAlreadyOnline: 'player with that name is already online',
  InvalidPassword: 'invalid password',
  LoginAllowed: '[a-z0-9] allowed, first letter',
} as const;

export const GameEvent = {
  Finish: 'finish',
};
