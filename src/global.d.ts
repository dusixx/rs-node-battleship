declare namespace NodeJS {
  type ProcessEnv = {
    HTTP_PORT: string;
    WS_PORT: string;
    NODE_ENV: 'development' | 'production' | 'test';
  };
}
