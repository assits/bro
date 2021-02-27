import { existsSync } from "fs-extra";
import { join } from "path";
import slash from "slash2";

export function getExistFile({ cwd, files, isRelative }) {
  for (const file of files) {
    const absFilePath = slash(join(cwd, file));
    if (existsSync(absFilePath)) {
      return isRelative ? file : absFilePath;
    }
  }
}
