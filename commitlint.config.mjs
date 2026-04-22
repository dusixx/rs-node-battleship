export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['init', 'feat', 'fix', 'refactor', 'style', 'docs', 'chore', 'test'],
    ],
  },
};
