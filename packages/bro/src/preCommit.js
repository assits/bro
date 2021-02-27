import { join, extname } from "path";
import { fsExtra, chalk, signale } from "@bomijs/utils";
import sgf from "staged-git-files";
import { spawn } from "child_process";
import { EOL } from "os";
import { format } from "prettier";
import { babelRegister, getUserConfig, CONFIG_FILES } from "@assits/bro-build/lib";
const { ensureDirSync, existsSync, readFileSync, writeFileSync, chmodSync } = fsExtra;

const HOOK_MARK = "##### CREATED BY BRO BUILD #####";
const PRETTIER_PARSER = {
  js: "babel",
  jsx: "babel",
  ts: "typescript",
  tsx: "typescript",
};

const cwd = process.cwd();

// register babel for config files
babelRegister({
  cwd,
  only: CONFIG_FILES,
});

const { preCommit: preCommitConfig = {} } = getUserConfig({ cwd });

function getPreCommitTemplate() {
  return [
    "#!/usr/bin/env bash",
    "npx bro-build pre-commit",
    "RESULT=$?",
    "[ $RESULT -ne 0 ] && exit 1",
    "exit 0",
    HOOK_MARK,
  ].join(EOL);
}

export function install() {
  const usePreCommit = !!Object.keys(preCommitConfig).length;

  const hookPath = join(cwd, ".git/hooks");
  const preCommitHooks = join(hookPath, "pre-commit");
  const existHooks = existsSync(preCommitHooks);
  const isFatherPreCommit = existHooks && readFileSync(preCommitHooks, "utf8").includes(HOOK_MARK);

  // Check if exist other hooks
  if (usePreCommit && existHooks && !isFatherPreCommit) {
    signale.warn("Another pre-commit hooks is in using. Father pre-commit hook will not work.");
    return;
  }

  if (usePreCommit && !existHooks) {
    // Create hook path
    ensureDirSync(hookPath);

    writeFileSync(preCommitHooks, getPreCommitTemplate(), "utf8");
    try {
      chmodSync(preCommitHooks, "777");
    } catch (e) {
      signale.warn(`chmod ${chalk.cyan(preCommitHooks)} failed: ${e.message}`);
    }

    signale.info("Create pre-commit hook");
  }
}

function runCmd(cmd, args) {
  return new Promise((resolve, reject) => {
    args = args || [];
    const runner = spawn(cmd, args, {
      // keep color
      stdio: "inherit",
    });
    runner.on("close", (code) => {
      if (code) {
        signale.error(`Error on execution: ${cmd} ${(args || []).join(" ")}`);
        reject(code);
        return;
      }
      resolve();
    });
  });
}

function getPrettierConfig() {
  const prettierrcPath = join(cwd, ".prettierrc");

  if (existsSync(prettierrcPath)) {
    return JSON.parse(readFileSync(prettierrcPath, "utf-8")) || {};
  } else {
    const templateConfig = require("@umijs/fabric/dist/prettier");
    return templateConfig;
  }
}

function getEsLintConfig() {
  const lintPath = join(cwd, ".eslintrc.js");
  const templateLintPath = require.resolve("@umijs/fabric/dist/eslint");

  return existsSync(lintPath) ? lintPath : templateLintPath;
}

export async function check() {
  const list = await sgf()
    .map((file) => file.filename)
    .filter((filename) => /^(src|tests|examples)/.test(filename))
    .filter((filename) => /\.(ts|js|tsx|jsx)$/.test(filename))

    // Only keep exist files
    .map((filename) => {
      const filePath = join(cwd, filename);
      return existsSync(filePath) ? filePath : null;
    })
    .filter(Boolean);

  if (!list.length) return;

  // Prettier
  if (preCommitConfig.prettier) {
    const prettierConfig = getPrettierConfig();

    list.forEach((filePath) => {
      if (existsSync(filePath)) {
        const ext = extname(filePath).replace(/^\./, "");
        const text = readFileSync(filePath, "utf8");
        const formatText = format(text, {
          parser: PRETTIER_PARSER[ext],
          ...prettierConfig,
        });

        writeFileSync(filePath, formatText, "utf8");
      }
    });

    signale.success(`${chalk.cyan("prettier")} success!`);
  }

  // eslint
  if (preCommitConfig.eslint) {
    const eslintConfig = getEsLintConfig();
    const eslintBin = require.resolve("eslint/bin/eslint");
    const args = [eslintBin, "-c", eslintConfig, ...list, "--fix"];

    try {
      await runCmd("node", args);
    } catch (code) {
      process.exit(code);
    }

    signale.success(`${chalk.cyan("eslint")} success!`);
  }

  await runCmd("git", ["add", ...list]);
}
