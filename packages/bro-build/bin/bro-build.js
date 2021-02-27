#!/usr/bin/env node

const { existsSync } = require("fs-extra");
const { join } = require("path");
const yParser = require("yargs-parser");
const chalk = require("chalk");
const signale = require("signale");

// print version and @local
const args = yParser(process.argv.slice(2), {
  alias: {
    version: ["v"],
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
} else {
  build();
}


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
    require("../lib/build").default({
      cwd: process.cwd(),
      watch: args.w || args.watch,
      buildArgs,
    });
  } catch (e) {
    signale.error(e);
    process.exit(1);
  }
}
