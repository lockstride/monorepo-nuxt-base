const {
  NxAppWebpackPlugin: nxAppWebpackPlugin,
} = require("@nx/webpack/app-plugin");
const { join } = require("path");
const {
  RunScriptWebpackPlugin: runScriptWebpackPlugin,
} = require("run-script-webpack-plugin");

const isServe = process.env.NX_SERVE === "true";

module.exports = {
  output: {
    path: join(__dirname, "../../dist/apps/api"),
  },
  plugins: [
    new nxAppWebpackPlugin({
      target: "node",
      compiler: "tsc",
      main: "./src/main.ts",
      tsConfig: "./tsconfig.app.json",
      assets: ["./src/assets"],
      optimization: false,
      outputHashing: "none",
      generatePackageJson: true,
    }),
    ...(isServe
      ? [new runScriptWebpackPlugin({ name: "main.js", autoRestart: true })]
      : []),
  ],
};
