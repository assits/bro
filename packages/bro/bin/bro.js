#!/usr/bin/env node
const { join } = require("path");
const {
  yParser,
  chalk,
  signale,
  fsExtra: { existsSync },
} = require("@bomijs/utils");
const preCommit = require("../lib/preCommit");

// print version and @local
const args = yParser(process.argv.slice(2), {
  alias: {
    version: ["v"],
    help: ["h"],
  },
  boolean: ["version"],
});

// Notify update when process exits
const updater = require("update-notifier");
const pkg = require("../package.json");
updater({ pkg }).notify({ defer: true });

if (args.version && !args._[0]) {
  args._[0] = "version";
  const local = existsSync(join(__dirname, "../.local")) ? chalk.cyan("@local") : "";
  const { name = "bro-build", version } = require("../package.json");
  console.log(`${name}@${version}${local}`);
  process.exit(0);
}

(function () {
  // Check if pre commit config
  preCommit.install();

  switch (args._[0]) {
    case "init":
      require("../lib/init")
        .default({
          cwd: process.cwd(),
          args,
        })
        .catch((err) => {
          console.error(`Create failed, ${err.message}`);
          console.error(err);
        });
      break;
    case "pre-commit":
      preCommit.check();
      break;
    case "build":
      build();
      break;
    case "help":
    case undefined:
      printHelp();
      break;
    default:
      console.error(chalk.red(`Unsupported command ${args._[0]}`));
      process.exit(1);
  }
})();

function stripEmptyKeys(obj) {
  Object.keys(obj).forEach((key) => {
    if (!obj[key] || (Array.isArray(obj[key]) && !obj[key].length)) {
      delete obj[key];
    }
  });
  return obj;
}

function build() {
  // Parse buildArgs from cli
  const buildArgs = stripEmptyKeys({
    esm: args.esm && { type: args.esm === true ? "rollup" : args.esm },
    cjs: args.cjs && { type: args.cjs === true ? "rollup" : args.cjs },
    umd: args.umd && { name: args.umd === true ? undefined : args.umd },
    iife: args.iife && { name: args.iife === true ? undefined : args.iife },
    file: args.file,
    target: args.target,
    entry: args._.slice(1),
  });

  if (buildArgs.file && buildArgs.entry && buildArgs.entry.length > 1) {
    signale.error(
      new Error(`Cannot specify file when have multiple entries (${buildArgs.entry.join(", ")})`)
    );
    process.exit(1);
  }

  try {
    require("@assits/bro-build").default({
      cwd: process.cwd(),
      watch: args.w || args.watch,
      buildArgs,
    });
  } catch (e) {
    signale.error(e);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
  Usage: bro <command> [options]

  Commands:

    ${chalk.green("build")}       build library
  `);
}
