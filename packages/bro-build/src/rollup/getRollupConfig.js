import { basename, extname, join } from "path";
import url from "@rollup/plugin-url";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import inject from "@rollup/plugin-inject";
import babel from "@rollup/plugin-babel";
import postcss from "rollup-plugin-postcss";
import { terser } from "rollup-plugin-terser";
import typescript2 from "rollup-plugin-typescript2";
import { camelCase } from "lodash";
import tempDir from "temp-dir";
import autoprefixer from "autoprefixer";
import NpmImport from "less-plugin-npm-import";
import svgr from "@svgr/rollup";
import { getBabelConfig } from "../babel/getBabelConfig";
import { Type } from "../constant";

export function getRollupConfig(opts) {
  const { cwd, type, entry, importLibToEs, bundleOpts } = opts;
  const {
    umd,
    iife,
    esm,
    cjs,
    file,
    target = "browser",
    include = /node_modules/,
    extraExternals = [],
    externalsExclude = [],
    nodeVersion,
  } = bundleOpts;

  const entryExt = extname(entry);
  const outputFileName = file || basename(entry, entryExt);
  const isTypeScript = entryExt === ".ts" || entryExt === ".tsx";

  let pkg = {};
  try {
    pkg = require(join(cwd, "package.json"));
  } catch (e) {}

  function getPkgNameByid(id) {
    const splitted = id.split("/");
    // @ 和 @tmp 是为了兼容 bomi 的逻辑
    return id.charAt(0) === "@" && splitted[0] !== "@" && splitted[0] !== "@tmp"
      ? splitted.slice(0, 2).join("/")
      : id.split("/")[0];
  }

  function isExternal(pkgs, excludes, id) {
    if (excludes.includes(id)) {
      return false;
    }
    return pkgs.includes(getPkgNameByid(id));
  }

  function getPlugins(opts) {
    // babel opts
    const runtimeHelpers = type === Type.cjs ? false : bundleOpts.runtimeHelpers;
    const extensions = [".js", ".jsx", ".ts", ".tsx", ".es6", ".es", ".mjs"];
    const babelOpts = {
      ...getBabelConfig({
        target: type === Type.esm ? "browser" : target,
        type,
        // watch 模式下有几率走的 babel？原因未知。
        typescript: false,
        runtimeHelpers,
        nodeVersion,
      })?.babelOpts,
      babelHelpers: runtimeHelpers ? "runtime" : "bundled",
      extensions,
      exclude: /\/node_modules\//,
      babelrc: false,
    };

    if (importLibToEs && type === Type.esm) {
      babelOpts.plugins.push(require.resolve("../../lib/importLibToEs"));
    }

    babelOpts.presets?.push(...(bundleOpts.extraBabelPresets || []));
    babelOpts.plugins?.push(...(bundleOpts.extraBabelPlugins || []));

    return [
      url(),
      svgr(),
      postcss({
        inject: bundleOpts.injectCSS || true,
        extract: bundleOpts.extractCSS || false,
        modules: bundleOpts.cssModules,
        ...(bundleOpts.cssModules ? { autoModules: false } : {}),
        minimize: opts?.minCSS,
        use: {
          less: {
            plugins: [new NpmImport({ prefix: "~" })],
            javascriptEnabled: true,
            ...(bundleOpts.lessInRollupMode || {}),
          },
          sass: bundleOpts.sassInRollupMode || {},
          stylus: false,
        },
        plugins: [
          autoprefixer({
            remove: false,
            ...(bundleOpts.autoprefixer || {}),
          }),
          ...(bundleOpts.extraPostCSSPlugins || []),
        ],
      }),
      ...(bundleOpts.inject ? [inject(bundleOpts.inject)] : []),
      ...(Object.keys(bundleOpts.replace || {}).length ? [replace(bundleOpts.replace)] : []),
      nodeResolve({
        mainFields: ["module", "jsnext:main", "main"],
        extensions,
        ...(bundleOpts.nodeResolveOpts || {}),
      }),
      ...(isTypeScript
        ? [
            typescript2({
              cwd,
              clean: true,
              cacheRoot: `${tempDir}/.rollup_plugin_typescript2_cache`,
              tsconfig: join(cwd, "tsconfig.json"),
              tsconfigDefaults: {
                compilerOptions: {
                  // Generate declaration files by default
                  declaration: true,
                },
              },
              tsconfigOverride: {
                compilerOptions: {
                  // Support dynamic import
                  target: "esnext",
                },
              },
              check: !bundleOpts.disableTypeCheck,
              ...(bundleOpts.typescriptOpts || {}),
            }),
          ]
        : []),
      babel(babelOpts),
      json(),
      ...(bundleOpts.extraRollupPlugins || []),
    ];
  }

  const input = join(cwd, entry);
  const format = type;

  const terserOpts = {
    compress: {
      pure_getters: true,
      unsafe: true,
      unsafe_comps: true,
      warnings: false,
    },
  };

  // ref: https://rollupjs.org/guide/en#external
  // 解决方案：可以用 function 处理
  const external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...extraExternals,
  ];
  // umd 只要 external peerDependencies
  const externalPeerDeps = [...Object.keys(pkg.peerDependencies || {}), ...extraExternals];

  switch (format) {
    case "esm":
      return [
        {
          input,
          output: {
            format,
            file: join(cwd, `dist/${esm?.file || `${outputFileName}.esm`}.js`),
          },
          plugins: [...getPlugins(), ...(esm?.minify ? [terser(terserOpts)] : [])],
          external: isExternal.bind(null, external, externalsExclude),
        },
        ...(esm?.mjs
          ? [
              {
                input,
                output: {
                  format,
                  file: join(cwd, `dist/${esm?.file || `${outputFileName}.esm`}.js`),
                },
                plugins: [
                  ...getPlugins(),
                  replace({ "process.env.NODE_ENV": JSON.stringify("production") }),
                  terser(terserOpts),
                ],
                external: isExternal.bind(null, external, externalsExclude),
              },
            ]
          : []),
      ];

    case "cjs":
      return [
        {
          input,
          output: {
            format,
            file: join(cwd, `dist/${cjs?.file || outputFileName}.js`),
          },
          plugins: [...getPlugins(), ...(cjs?.minify ? [terser(terserOpts)] : [])],
          external: isExternal.bind(null, external, externalsExclude),
        },
      ];

    case "umd":
      // Add umd related plugins
      const extraUmdPlugins = [commonjs({ include })];

      return [
        {
          input,
          output: {
            format,
            sourcemap: !!umd?.sourcemap,
            file: join(cwd, `dist/${umd?.file || `${outputFileName}.umd`}.js`),
            globals: umd?.globals,
            name: umd?.name || (pkg.name && camelCase(basename(pkg.name))),
          },
          plugins: [
            ...getPlugins(),
            ...extraUmdPlugins,
            replace({ "process.env.NODE_ENV": JSON.stringify("production") }),
          ],
          external: isExternal.bind(null, external, externalsExclude),
        },
        ...(umd?.minify
          ? [
              {
                input,
                output: {
                  format,
                  sourcemap: !!umd?.sourcemap,
                  file: join(cwd, `dist/${umd?.file || `${outputFileName}.umd`}.min.js`),
                  globals: umd?.globals,
                  name: umd?.name || (pkg.name && camelCase(basename(pkg.name))),
                },
                plugins: [
                  ...getPlugins({ minCSS: true }),
                  ...extraUmdPlugins,
                  replace({ "process.env.NODE_ENV": JSON.stringify("production") }),
                  terser(terserOpts),
                ],
                external: isExternal.bind(null, externalPeerDeps, externalsExclude),
              },
            ]
          : []),
      ];

    case "iife":
      return [
        {
          input,
          output: {
            format,
            file: join(cwd, `dist/${iife?.file || `${outputFileName}.iife`}.js`),
            name: iife?.name || (pkg.name && camelCase(basename(pkg.name))),
          },
          plugins: [...getPlugins(), ...(iife?.minify ? [terser(terserOpts)] : [])],
          external: isExternal.bind(null, external, externalsExclude),
        },
        ...(iife?.minify
          ? [
              {
                input,
                output: {
                  format,
                  file: join(cwd, `dist/${iife?.file || `${outputFileName}.iife`}.js`),
                  name: iife?.name || (pkg.name && camelCase(basename(pkg.name))),
                },
                plugins: [
                  ...getPlugins(),
                  replace({ "process.env.NODE_ENV": JSON.stringify("production") }),
                  terser(terserOpts),
                ],
                external: isExternal.bind(null, external, externalsExclude),
              },
            ]
          : []),
      ];

    default:
      throw new Error(`Unsupported type ${type}`);
  }
}
