module.exports = {
  apps: [
    {
      name: "ide-node-1",
      script: "src/index.ts",
      interpreter: "node",
      interpreter_args: "-r ts-node/register",
      env: {
        PORT: 4000
      }
    },
    {
      name: "ide-node-2",
      script: "src/index.ts",
      interpreter: "node",
      interpreter_args: "-r ts-node/register",
      env: {
        PORT: 4001
      }
    },
    {
      name: "ide-node-3",
      script: "src/index.ts",
      interpreter: "node",
      interpreter_args: "-r ts-node/register",
      env: {
        PORT: 4002
      }
    }
  ]
};
