/**
 * Commit rules for the frontend repository.
 *
 * `PentaVault-Backend/.commitlintrc.json` must stay identical to this. They are
 * separate git repositories, so the list cannot be shared as a file — but a
 * message that is valid in one repository and rejected in the other is a trap,
 * and it has cost real commits. If you change the type list, change both, and
 * update the list in `CLAUDE.md`.
 *
 * `security` and `deps` are additions to the conventional set: the first marks
 * changes whose reason is a security property rather than a feature, and the
 * second isolates dependency bumps from unrelated `chore` work.
 */
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
        'build',
        'ci',
        'revert',
      ],
    ],
    'header-max-length': [0],
    'subject-case': [0],
    'subject-max-length': [0],
    'body-max-line-length': [2, 'always', 200],
  },
}
