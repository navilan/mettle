// eslint-disable-next-line
module.exports = {
  preset: "ts-jest",
  rootDir: "./",
  clearMocks: true,
  collectCoverage: false,
  testEnvironment: "jsdom",
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts"],
  setupFiles: ["./scripts/jest-setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/scripts/jest-setup-after-env.ts"],
  modulePathIgnorePatterns: [
    "<rootDir>/packages/.*/build",
    "<rootDir>/packages/.*/compiler-debug",
    "<rootDir>/_tmp"
  ],
  verbose: true,
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.jest.json"
    }
  }
}
