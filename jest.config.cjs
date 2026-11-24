const { existsSync } = require("node:fs");
const { join } = require("node:path");

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["src", "site", "scripts"].filter((d) => existsSync(join(__dirname, d))).map((d) => `<rootDir>/${d}`),
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "\\.css$": "<rootDir>/site/test/styleStub.ts",
  },
  transform: { "^.+\\.[tj]sx?$": "babel-jest" },
};
