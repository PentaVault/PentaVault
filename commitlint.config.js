module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'perf',
        'security',
        'refactor',
        'style',
        'test',
        'docs',
        'chore',
        'deps',
        'revert',
      ],
    ],
    'header-max-length': [0],
    'subject-case': [0],
    'subject-max-length': [0],
    'body-max-line-length': [2, 'always', 200],
  },
}
