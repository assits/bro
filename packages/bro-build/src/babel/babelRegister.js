import slash from "slash2";
import { join } from "path";
import { getBabelConfig } from "./getBabelConfig";

export function babelRegister({ cwd, only }) {
  const { babelOpts } = getBabelConfig({
    target: "node",
    typescript: false,
  });

  require("@babel/register")({
    ...babelOpts,
    extensions: [".es6", ".es", ".jsx", ".js", ".mjs", ".ts", ".tsx"],
    only: only.map((file) => slash(join(cwd, file))),
    babelrc: false,
    cache: false,
  });
}
