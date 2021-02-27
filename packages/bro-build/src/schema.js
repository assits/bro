export default (joi) =>
  joi.object({
    entry: joi.alternatives(joi.string(), joi.array().items(joi.string())),
    target: joi.string(),
    file: joi.string(),
    esm: joi.alternatives(
      joi.string(),
      joi.boolean(),
      joi.object({
        file: joi.string(),
        type: joi.string().pattern(/^(rollup|babel)$/),
        mjs: joi.boolean(),
        minify: joi.boolean(),
        importLibToEs: joi.boolean(),
      })
    ),
    cjs: joi.alternatives(
      joi.string(),
      joi.boolean(),
      joi.object({
        file: joi.string(),
        type: joi.string().pattern(/^(rollup|babel)$/),
        minify: joi.boolean(),
        lazy: joi.boolean(),
      })
    ),
    umd: joi.alternatives(
      joi.boolean(),
      joi.object({
        file: joi.string(),
        name: joi.string(),
        minify: joi.boolean(),
        globals: joi.boolean(),
        sourcemap: joi.alternatives(joi.boolean(), joi.string().pattern(/^(inline|hidden)$/)),
      })
    ),
    iife: joi.alternatives(
      joi.boolean(),
      joi.object({
        file: joi.string(),
        name: joi.string(),
        minify: joi.boolean(),
      })
    ),
    nodeFiles: joi.array(),
    browserFiles: joi.array(),
    nodeVersion: joi.alternatives(joi.string(), joi.number()),
    extraBabelPresets: joi.array(),
    extraBabelPlugins: joi.array(),
    extraRollupPlugins: joi.array(),
    extraPostCSSPlugins: joi.array(),
    extraExternals: joi.array(),
    externalsExclude: joi.array(),
    cssModules: joi.alternatives(joi.boolean(), joi.object()),
    extractCSS: joi.boolean(),
    injectCSS: joi.boolean(),
    autoprefixer: joi.object(),
    lessInRollupMode: joi.object(),
    sassInRollupMode: joi.object(),
    include: joi.alternatives(joi.string(), joi.object()),
    runtimeHelpers: joi.boolean(),
    nodeResolveOpts: joi.object(),
    replace: joi.object(),
    inject: joi.object(),
    preCommit: joi.object(),
    typescriptOpts: joi.object(),
    disableTypeCheck: joi.boolean(),
    pkgs: joi.array(),
  });
