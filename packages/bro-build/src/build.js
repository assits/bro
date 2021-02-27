import { existsSync, readdirSync, statSync } from "fs-extra";
import { join } from "path";
import { merge } from "lodash";
import signale from "signale";
import rimraf from "rimraf";
import chalk from "chalk";
import assert from "assert";
import babel from "./babel/babel";
import rollup from "./rollup/rollup";
import { babelRegister } from "./babel/babelRegister";
import { getExistFile } from "./utils/getExistFile";
import { getUserConfig, CONFIG_FILES } from "./utils/getUserConfig";
import { getRandomColor } from "./utils/getRandomColor";

function isTSFile(filePath) {
  return filePath.endsWith(".ts") || filePath.endsWith(".tsx");
}

export function getBundleOpts(opts) {
  const { cwd, rootPath, buildArgs = {}, rootConfig = {} } = opts;
  const entry = getExistFile({
    cwd,
    files: ["src/index.js", "src/index.ts", "src/index.jsx", "src/index.tsx"],
    isRelative: true,
  });

  const userConfig = getUserConfig({ cwd });
  const userConfigs = Array.isArray(userConfig) ? userConfig : [userConfig];

  return userConfigs.map((config) => {
    const bundleOpts = merge({ entry }, rootConfig, config, buildArgs);
    // Support config esm: 'rollup' and cjs: 'rollup'
    if (typeof bundleOpts.esm === "string") {
      bundleOpts.esm = { type: bundleOpts.esm };
    }
    if (typeof bundleOpts.cjs === "string") {
      bundleOpts.cjs = { type: bundleOpts.cjs };
    }

    if (!!bundleOpts.runtimeHelpers) {
      const pkg = require(join(cwd, "package.json"));
      assert(
        !!pkg?.dependencies?.["@babel/runtime"],
        `@babel/runtime dependency is required to use runtimeHelpers`
      );
    }

    if (!bundleOpts.esm && !bundleOpts.cjs && !bundleOpts.umd && !bundleOpts.iife) {
      throw new Error(
        ` None format of ${chalk.hex("#FFCD32").bold("cjs | esm | umd")} is configured.`
      );
    }

    if (bundleOpts.cjs?.type === "rollup" && bundleOpts.cjs?.lazy) {
      throw new Error(`cjs.lazy don't support rollup.`);
    }

    if (!!bundleOpts.entry) {
      const tsConfigPath = join(cwd, "tsconfig.json");
      const hasTSConfig =
        existsSync(tsConfigPath) || (rootPath && existsSync(join(rootPath, "tsconfig.json")));
      if (
        !hasTSConfig &&
        ((Array.isArray(bundleOpts.entry) && bundleOpts.entry.some(isTSFile)) ||
          (!Array.isArray(bundleOpts.entry) && isTSFile(bundleOpts.entry)))
      ) {
        signale.warn(
          `Project using ${chalk.hex("#FFCD32").bold("typescript")} but tsconfig.json not exists.`
        );
      }
    }

    return bundleOpts;
  });
}

export function build(opts, { pkg }) {
  const { cwd, rootPath, watch } = opts;
  // register babel for config files
  babelRegister({
    cwd,
    only: CONFIG_FILES,
  });

  function log(msg) {
    console.log(`${pkg ? `${getRandomColor(pkg)}:` : ""} ${msg}\r\n`);
  }

  // Get user config
  const bundleOptsArr = getBundleOpts(opts);
  bundleOptsArr.forEach(async (bundleOpts) => {
    // Clean dist
    rimraf.sync(join(cwd, "dist"));

    //Build umd
    if (!!bundleOpts.umd) {
      log(`Build umd with rollup`);
      await rollup({
        cwd,
        type: "umd",
        entry: bundleOpts.entry,
        watch,
        bundleOpts,
      });
    }

    //Build iife
    if (!!bundleOpts.iife) {
      log(`Build iife with rollup`);
      await rollup({
        cwd,
        type: "iife",
        entry: bundleOpts.entry,
        watch,
        bundleOpts,
      });
    }

    // Build cjs
    if (!!bundleOpts.cjs) {
      log(`Build cjs with ${bundleOpts.cjs.type}`);
      bundleOpts.cjs.type === "babel"
        ? await babel({ cwd, rootPath, type: "cjs", watch, bundleOpts })
        : await rollup({
            cwd,
            type: "cjs",
            entry: bundleOpts.entry,
            watch,
            bundleOpts,
          });
    }

    // Build esm
    if (!!bundleOpts.esm) {
      log(`Build esm with ${bundleOpts.esm.type}`);
      bundleOpts.esm.type === "babel"
        ? await babel({ cwd, rootPath, type: "esm", watch, bundleOpts })
        : await rollup({
            cwd,
            type: "esm",
            entry: bundleOpts.entry,
            watch,
            bundleOpts,
          });
    }
  });
}

export function buildForLerna(opts) {
  const { cwd } = opts;
  // register babel for config files
  babelRegister({
    cwd,
    only: CONFIG_FILES,
  });

  const rootConfig = merge(getUserConfig({ cwd }), opts.rootConfig || {});

  let pkgs = readdirSync(join(cwd, "packages"));

  // support define pkgs in lerna
  if (!!rootConfig.pkgs) {
    pkgs = rootConfig.pkgs;
  }
  //支持 scope
  pkgs = pkgs.reduce((memo, pkg) => {
    const pkgPath = join(cwd, "packages", pkg);
    if (statSync(pkgPath).isDirectory()) {
      if (pkg.startsWith("@")) {
        readdirSync(join(cwd, "packages", pkg)).filter((subPkg) => {
          if (statSync(join(cwd, "packages", pkg, subPkg)).isDirectory()) {
            memo = memo.concat(`${pkg}/${subPkg}`);
          }
        });
      } else {
        memo = memo.concat(pkg);
      }
    }
    return memo;
  }, []);

  for (const pkg of pkgs) {
    if (process.env.PACKAGE && pkg !== process.env.PACKAGE) continue;
    // build error when .DS_Store includes in packages root
    const pkgPath = join(cwd, "packages", pkg);
    assert(existsSync(join(pkgPath, "package.json")), `package.json not found in packages/${pkg}`);

    process.chdir(pkgPath);

    build(
      {
        ...opts,
        cwd: pkgPath,
        rootPath: cwd,
        rootConfig,
      },
      {
        pkg,
      }
    );
  }
}

export default function (opts) {
  const useLerna = existsSync(join(opts.cwd, "lerna.json"));
  !!useLerna && process.env.LERNA !== "none" ? buildForLerna(opts) : build(opts);
}
