// eslint-disable-next-line
module.exports = {
  preset: "ts-jest",
  rootDir: "./",
  clearMocks: true,
  collectCoverage: false,
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
  setupFiles: ["<rootDir>/../../scripts/jest-setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/../../scripts/jest-setup-after-env.ts"],
  modulePathIgnorePatterns: [
    ".*__mocks__.*",
    "<rootDir>/build",
    "<rootDir>/compiler-debug",
    "<rootDir>/_tmp"
  ],
  verbose: true,
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.jest.json",
      compiler: "ttypescript"
    }
  }
}