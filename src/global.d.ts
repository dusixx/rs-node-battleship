declare namespace NodeJS {
  type ProcessEnv = {
    PORT: string;
    NODE_ENV: 'development' | 'production' | 'test';
  };
}
