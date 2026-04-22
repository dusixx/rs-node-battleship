export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/src/server', '/src/common'],
  transform: {
    '^.+\\.ts$': ['ts-jest'],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  coverageReporters: ['text'],
};
