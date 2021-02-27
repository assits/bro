import signale from "signale";
import chalk from "chalk";
import { rollup, watch } from "rollup";
import { getRollupConfig } from "./getRollupConfig";
import { Type } from "../constant";

async function build(entry, opts) {
  const { cwd, type, bundleOpts, importLibToEs } = opts;
  const rollupConfigs = getRollupConfig({
    cwd,
    type,
    entry,
    importLibToEs,
    bundleOpts,
  });

  for (const config of rollupConfigs) {
    if (opts.watch) {
      const watcher = watch([{ ...config, watch: {} }]);
      watcher.on("event", (res) => {
        if (res.error) {
          signale.error(res.error);
        }

        if (res.code === "START") {
          console.log(`[${type}] Rebuild since file changed`);
        }
      });

      process.once("SIGINT", () => watcher.close());
    } else {
      const { output, ...inputOptions } = config;
      const bundle = await rollup(inputOptions);
      await bundle.write(output);
      console.log(
        `${chalk.bold.green(` √ `)}Transform to ${type} for ${chalk[
          type === Type.esm ? "cyan" : type === Type.cjs ? "blue" : "yellow"
        ](output.file)}`
      );
    }
  }
}

export default async function (opts) {
  try {
    if (Array.isArray(opts.entry)) {
      const { entry: entries } = opts;
      for (const entry of entries) {
        await build(entry, opts);
      }
    } else {
      await build(opts.entry, opts);
    }
  } catch (err) {
    signale.error(err);
  }
}
