import { join, extname, relative } from "path";
import { existsSync, readFileSync, statSync } from "fs-extra";
import vfs from "vinyl-fs";
import signale from "signale";
import chalk from "chalk";
import rimraf from "rimraf";
import through from "through2";
import slash from "slash2";
import lodash from "lodash";
import * as chokidar from "chokidar";
import * as babel from "@babel/core";
import * as ts from "typescript";
import gulpTs from "gulp-typescript";
import gulpPlumber from "gulp-plumber";
import gulpIf from "gulp-if";
import { getBabelConfig } from "./getBabelConfig";
import { Type } from "../constant";

export default async function (opts) {
  const { cwd, rootPath, type, watch, importLibToEs } = opts;
  const {
    cjs,
    target = "browser",
    extraBabelPresets = [],
    extraBabelPlugins = [],
    runtimeHelpers,
    browserFiles = [],
    nodeFiles = [],
    nodeVersion,
    disableTypeCheck,
  } = opts.bundleOpts;

  const targetDir = type === Type.esm ? "es" : "lib";
  const absSrcPath = join(cwd, "src");
  const absTargetPath = join(cwd, targetDir);

  // clean targetDir
  rimraf.sync(absTargetPath);

  function transform({ file, type }) {
    const { babelOpts } = getBabelConfig({
      target,
      type,
      typescript: false,
      runtimeHelpers,
      filePath: slash(relative(cwd, file.path)),
      browserFiles,
      nodeFiles,
      nodeVersion,
      lazy: cjs?.lazy,
    });

    if (importLibToEs && type === Type.esm) {
      babelOpts.plugins.push(require.resolve("../../lib/importLibToEs"));
    }

    babelOpts.presets.push(...extraBabelPresets);
    babelOpts.plugins.push(...extraBabelPlugins);

    const relFile = slash(file.path).replace(`${cwd}/`, "");
    console.log(
      `${chalk.bold.green(` √ `)}Transform to ${type} for ${chalk[
        type === Type.cjs ? "blue" : "cyan"
      ](relFile)}`
    );

    return babel.transform(file.contents, {
      ...babelOpts,
      filename: file.path,
      // 不读取外部的babel.config.js配置文件，全采用babelOpts中的babel配置来构建
      configFile: false,
    })?.code;
  }

  /**
   * tsconfig.json is not valid json file
   * https://github.com/Microsoft/TypeScript/issues/20384
   */
  function parseTsconfig(path) {
    const readFile = (path) => readFileSync(path, "utf-8");
    const result = ts.readConfigFile(path, readFile);
    if (result.error) {
      return;
    }
    return result.config;
  }

  function getTsconfigCompilerOptions(path) {
    const config = parseTsconfig(path);
    return config ? config.compilerOptions : undefined;
  }

  function getTSConfig() {
    const tsconfigPath = join(cwd, "tsconfig.json");
    const templateTsconfigPath = join(__dirname, "../../template/tsconfig.json");

    if (existsSync(tsconfigPath)) {
      return getTsconfigCompilerOptions(tsconfigPath) || {};
    }
    if (rootPath && existsSync(join(rootPath, "tsconfig.json"))) {
      return getTsconfigCompilerOptions(join(rootPath, "tsconfig.json")) || {};
    }
    return getTsconfigCompilerOptions(templateTsconfigPath) || {};
  }

  function createStream(src) {
    const tsConfig = getTSConfig();
    const babelTransformRegexp = disableTypeCheck ? /\.(t|j)sx?$/ : /\.jsx?$/;

    function isTsFile(path) {
      return /\.tsx?$/.test(path) && !path.endsWith(".d.ts");
    }

    function isTransform(path) {
      return babelTransformRegexp.test(path) && !path.endsWith(".d.ts");
    }

    return vfs
      .src(src, {
        allowEmpty: true,
        base: absSrcPath,
      })
      .pipe(watch ? gulpPlumber() : through.obj())
      .pipe(gulpIf((f) => !disableTypeCheck && isTsFile(f.path), gulpTs(tsConfig)))
      .pipe(
        gulpIf(
          (f) => isTransform(f.path),
          through.obj((file, env, cb) => {
            try {
              file.contents = Buffer.from(
                transform({
                  file,
                  type,
                })
              );
              // .jsx -> .js
              file.path = file.path.replace(extname(file.path), ".js");
              cb(null, file);
            } catch (e) {
              signale.error(`Compiled faild: ${file.path}`);
              console.log(e);
              cb(null);
            }
          })
        )
      )
      .pipe(vfs.dest(absTargetPath));
  }

  return new Promise((resolve) => {
    const patterns = [
      join(absSrcPath, "**/*"),
      `!${join(absSrcPath, "**/fixtures{,/**}")}`,
      `!${join(absSrcPath, "**/demos{,/**}")}`,
      `!${join(absSrcPath, "**/__test__{,/**}")}`,
      `!${join(absSrcPath, "**/*.mdx")}`,
      `!${join(absSrcPath, "**/*.md")}`,
      `!${join(absSrcPath, "**/*.+(test|e2e|spec).+(js|jsx|ts|tsx)")}`,
    ];
    createStream(patterns).on("end", () => {
      if (watch) {
        console.log(
          `${chalk.bgBlue.black(` INFO `)} Start watching ${slash(absSrcPath).replace(
            `${cwd}/`,
            ""
          )} directory...`
        );
        const watcher = chokidar.watch(patterns, {
          ignoreInitial: true,
        });

        const files = [];
        function compileFiles() {
          while (files.length) {
            createStream(files.pop());
          }
        }

        const debouncedCompileFiles = lodash.debounce(compileFiles, 1000);

        watcher.on("all", (event, fullPath) => {
          const relPath = fullPath.replace(absSrcPath, "");
          console.log(
            `${chalk.green(`[${event}]`)}`,
            `${slash(join(absSrcPath, relPath)).replace(`${cwd}/`, "")}`
          );
          if (!existsSync(fullPath)) return;
          if (statSync(fullPath).isFile()) {
            if (!files.includes(fullPath)) files.push(fullPath);
            debouncedCompileFiles();
          }
        });
        process.once("SIGINT", () => {
          watcher.close();
        });
      }
      resolve();
    });
  });
}
