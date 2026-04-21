module.exports = {
  roots: ['<rootDir>/src'],
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testPathIgnorePatterns: ['<rootDir>/PentaVault-Backend/', '<rootDir>/.next/'],
}
