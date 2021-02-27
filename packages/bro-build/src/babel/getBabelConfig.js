import { extname } from "path";
import { Target, Type } from "../constant";

export function getBabelConfig(opts) {
  const {
    target,
    type,
    typescript,
    runtimeHelpers,
    filePath,
    browserFiles = [],
    nodeFiles = [],
    nodeVersion = "current",
    lazy,
  } = opts;

  let isBrowser = target === Target.browser;
  if (filePath) {
    if (extname(filePath) === ".tsx" || extname(filePath) === ".jsx") {
      isBrowser = true;
    } else {
      isBrowser = isBrowser
        ? nodeFiles.includes(filePath)
          ? true
          : isBrowser
        : browserFiles.includes(filePath)
        ? true
        : isBrowser;
    }
  }

  const targets = isBrowser ? { browsers: ["last 2 versions", "IE 10"] } : { node: nodeVersion };

  const presets = [
    [
      require.resolve("@babel/preset-env"),
      {
        targets,
        modules: type === Type.esm ? false : "auto",
      },
    ],
    typescript && [require.resolve("@babel/preset-typescript"), { allowNamespaces: true }],
    isBrowser && [require.resolve("@vue/babel-preset-jsx")],
    isBrowser && [require.resolve("@babel/preset-react")],
  ].filter(Boolean);

  const plugins = [
    ...(!isBrowser && type === Type.cjs && lazy
      ? [
          [
            require.resolve("@babel/plugin-transform-modules-commonjs"),
            {
              lazy: true,
            },
          ],
        ]
      : []),
    require.resolve("@babel/plugin-syntax-dynamic-import"),
    require.resolve("@babel/plugin-proposal-export-namespace-from"),
    require.resolve("@babel/plugin-proposal-export-default-from"),
    typescript && [require.resolve("babel-plugin-transform-typescript-metadata")],
    [require.resolve("@babel/plugin-proposal-decorators"), { legacy: true }],
    [require.resolve("@babel/plugin-proposal-class-properties"), { loose: true }],
    [require.resolve("@babel/plugin-proposal-optional-chaining"), { loose: false }],
    [require.resolve("@babel/plugin-proposal-nullish-coalescing-operator"), { loose: false }],
    [require.resolve("@babel/plugin-transform-destructuring"), { loose: false }],
    [require.resolve("@babel/plugin-proposal-pipeline-operator"), { proposal: "minimal" }],
    runtimeHelpers && [
      require.resolve("@babel/plugin-transform-runtime"),
      {
        version: require("@babel/runtime/package.json").version,
        corejs: false,
        absoluteRuntime: dirname(require.resolve("@babel/runtime/package.json")),
        useESModules: true,
      },
    ],
    process.env.COVERAGE && [require.resolve("babel-plugin-istanbul")],
  ].filter(Boolean);

  return {
    babelOpts: { presets, plugins },
    isBrowser,
  };
}
